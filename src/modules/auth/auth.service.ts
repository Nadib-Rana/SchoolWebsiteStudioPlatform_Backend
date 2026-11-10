import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { MailService } from "../mail/mail.service";
import { HashUtil } from "../../common/utils/hash.util";
import { Role, UserStatus } from "@prisma/client";
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from "./dto/auth.dto";
import { AuthTokenService } from "./auth-token.service";
import { AuthPasswordService } from "./auth-password.service";
import { AuthProfileService } from "./auth-profile.service";
import {
  REGISTER_USER_SELECT,
  sendRegistrationOtpAndWelcome,
} from "./auth.helper";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly tokenService: AuthTokenService,
    private readonly passwordService: AuthPasswordService,
    private readonly profileService: AuthProfileService,
  ) {}

  generateTokens(user: {
    id: string;
    email: string;
    role: Role;
    username?: string | null;
  }) {
    return this.tokenService.generateTokens(user);
  }

  async register(dto: RegisterDto) {
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

    const hashedPassword = await HashUtil.hash(dto.password);

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
      select: REGISTER_USER_SELECT,
    });

    await sendRegistrationOtpAndWelcome(this.prisma, this.mailService, user);

    const tokens = this.tokenService.generateTokens(user);

    return {
      user,
      ...tokens,
      message:
        "Registration successful. A verification OTP has been sent to your email.",
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const rawId = dto.identifier || dto.email;
    if (!rawId) {
      throw new BadRequestException("Email or username is required");
    }
    const identifier = rawId.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: rawId.trim() }],
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.tokenService.generateTokens(user);
    await this.tokenService.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

    const schoolMembers = await this.profileService.getUserSchoolMembers(
      user.id,
    );

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
        schoolMembers,
        activeSchool: schoolMembers[0]?.school || null,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string, ipAddress?: string) {
    return this.tokenService.refreshToken(refreshToken, ipAddress);
  }

  async verifyEmailOtp(email: string, code: string) {
    return this.passwordService.verifyEmailOtp(email, code);
  }

  async resendVerificationOtp(email: string) {
    return this.passwordService.resendVerificationOtp(email);
  }

  async forgotPassword(email: string) {
    return this.passwordService.forgotPassword(email);
  }

  async resetPassword(dto: ResetPasswordDto) {
    return this.passwordService.resetPassword(dto);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    return this.passwordService.changePassword(userId, dto);
  }

  async logout(userId: string) {
    return this.tokenService.logout(userId);
  }

  async getProfile(userId: string) {
    return this.profileService.getProfile(userId);
  }
}
