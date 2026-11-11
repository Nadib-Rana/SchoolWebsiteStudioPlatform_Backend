import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  name: process.env.APP_NAME || "Nest Starter Template",
  port: parseInt(process.env.PORT || "3000", 10),
  apiPrefix: process.env.API_PREFIX || "api/v1",
  appUrl: process.env.APP_URL || "https://profilebackendapi.ashyshop.com",
  frontendUrl: process.env.FRONTEND_URL || "https://nadib.ashyshop.com",
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : "*",
}));
