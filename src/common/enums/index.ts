import { Role, UserStatus, OtpType } from "@prisma/client";

export { Role, UserStatus, OtpType };

export enum Environment {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
  TEST = "test",
}
