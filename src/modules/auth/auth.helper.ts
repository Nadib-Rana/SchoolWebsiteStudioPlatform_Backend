import { PrismaService } from "../../database/prisma.service";
import { MailService } from "../mail/mail.service";
import { OtpUtil } from "../../common/utils/otp.util";
import { OtpType } from "@prisma/client";

export const REGISTER_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  isEmailVerified: true,
  createdAt: true,
} as const;

export async function sendRegistrationOtpAndWelcome(
  prisma: PrismaService,
  mailService: MailService,
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    username?: string | null;
  },
) {
  const otp = OtpUtil.generateNumericOtp(6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpToken.create({
    data: {
      email: user.email,
      code: otp,
      type: OtpType.EMAIL_VERIFICATION,
      expiresAt,
      userId: user.id,
    },
  });

  const displayName = user.firstName || user.username || "User";
  void mailService.sendEmailVerificationOtp(user.email, displayName, otp);
  void mailService.sendWelcomeEmail(user.email, displayName);
}
