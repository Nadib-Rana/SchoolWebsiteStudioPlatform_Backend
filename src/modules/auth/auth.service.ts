import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { MailService } from "../mail/mail.service";
import { HashUtil } from "../../common/utils/hash.util";
import { OtpUtil } from "../../common/utils/otp.util";
import { OtpType, Role, UserStatus } from "@prisma/client";
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from "./dto/auth.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private generateTokens(user: {
    id: string;
    email: string;
    role: Role;
    username?: string | null;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username || undefined,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(
        "jwt.secret",
        "default_super_secret_jwt_key_change_in_production_12345",
      ),
      expiresIn: (this.configService.get<string>("jwt.expiresIn") || "15m") as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(
        "jwt.refreshSecret",
        "default_super_secret_jwt_refresh_key_change_in_production_12345",
      ),
      expiresIn: (this.configService.get<string>("jwt.refreshExpiresIn") || "7d") as any,
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    // 1. Check if user with email exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email.toLowerCase() },
          dto.username ? { username: dto.username } : {},
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email.toLowerCase()) {
        throw new ConflictException("A user with this email already exists");
      }
      throw new ConflictException("A user with this username already exists");
    }

    // 2. Hash password
    const hashedPassword = await HashUtil.hash(dto.password);

    // 3. Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username || null,
        password: hashedPassword,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        phoneNumber: dto.phoneNumber || null,
        role: Role.USER,
        status: UserStatus.ACTIVE,
        isEmailVerified: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    // 4. Generate & Send OTP for verification
    const otp = OtpUtil.generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.otpToken.create({
      data: {
        email: user.email,
        code: otp,
        type: OtpType.EMAIL_VERIFICATION,
        expiresAt,
        userId: user.id,
      },
    });

    // Send verification email in background
    void this.mailService.sendEmailVerificationOtp(
      user.email,
      user.firstName || user.username || "User",
      otp,
    );

    // Send welcome email in background
    void this.mailService.sendWelcomeEmail(
      user.email,
      user.firstName || user.username || "User",
    );

    const tokens = this.generateTokens(user);

    return {
      user,
      ...tokens,
      message:
        "Registration successful. A verification OTP has been sent to your email.",
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const identifier = dto.identifier.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: dto.identifier.trim() },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email/username or password");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        `Account is ${user.status.toLowerCase()}. Please contact administrator.`,
      );
    }

    const isPasswordValid = await HashUtil.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email/username or password");
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.generateTokens(user);

    // Save refresh token record
    const tokenHash = await HashUtil.hash(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        device: userAgent,
        ipAddress,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string, ipAddress?: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>(
          "jwt.refreshSecret",
          "default_super_secret_jwt_refresh_key_change_in_production_12345",
        ),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException("Invalid refresh token or inactive account");
      }

      // Generate new tokens
      const newTokens = this.generateTokens(user);

      // Save new refresh token
      const tokenHash = await HashUtil.hash(newTokens.refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await this.prisma.refreshToken.create({
        data: {
          tokenHash,
          userId: user.id,
          ipAddress,
          expiresAt,
        },
      });

      return newTokens;
    } catch {
      throw new UnauthorizedException("Refresh token is expired or invalid");
    }
  }

  async verifyEmailOtp(email: string, code: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await this.prisma.otpToken.findFirst({
      where: {
        email: normalizedEmail,
        code: code.trim(),
        type: OtpType.EMAIL_VERIFICATION,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw new BadRequestException("Invalid or expired verification code");
    }

    // Mark OTP as used
    await this.prisma.otpToken.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Mark user email as verified
    const user = await this.prisma.user.update({
      where: { email: normalizedEmail },
      data: { isEmailVerified: true },
      select: {
        id: true,
        email: true,
        username: true,
        isEmailVerified: true,
      },
    });

    return {
      message: "Email successfully verified",
      user,
    };
  }

  async resendVerificationOtp(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new NotFoundException("User not found with this email");
    }

    if (user.isEmailVerified) {
      throw new BadRequestException("Email is already verified");
    }

    const otp = OtpUtil.generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpToken.create({
      data: {
        email: user.email,
        code: otp,
        type: OtpType.EMAIL_VERIFICATION,
        expiresAt,
        userId: user.id,
      },
    });

    void this.mailService.sendEmailVerificationOtp(
      user.email,
      user.firstName || user.username || "User",
      otp,
    );

    return { message: "A new verification OTP has been sent to your email" };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Do not reveal whether user exists for security
      return {
        message:
          "If an account with that email exists, a password reset code has been sent.",
      };
    }

    const otp = OtpUtil.generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.otpToken.create({
      data: {
        email: user.email,
        code: otp,
        type: OtpType.PASSWORD_RESET,
        expiresAt,
        userId: user.id,
      },
    });

    void this.mailService.sendPasswordResetOtp(
      user.email,
      user.firstName || user.username || "User",
      otp,
      15,
    );

    return {
      message:
        "If an account with that email exists, a password reset code has been sent.",
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const otpRecord = await this.prisma.otpToken.findFirst({
      where: {
        email: normalizedEmail,
        code: dto.code.trim(),
        type: OtpType.PASSWORD_RESET,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw new BadRequestException("Invalid or expired password reset code");
    }

    const newHashedPassword = await HashUtil.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: normalizedEmail },
        data: { password: newHashedPassword },
      }),
      this.prisma.otpToken.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      }),
      // Revoke existing refresh tokens
      this.prisma.refreshToken.updateMany({
        where: { user: { email: normalizedEmail } },
        data: { isRevoked: true },
      }),
    ]);

    return { message: "Password has been successfully reset. You can now login." };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const isMatch = await HashUtil.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException("Incorrect current password");
    }

    const newHashedPassword = await HashUtil.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    return { message: "Password updated successfully" };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { message: "Logged out successfully" };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phoneNumber: true,
        role: true,
        status: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User profile not found");
    }

    return user;
  }
}
