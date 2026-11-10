import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export function configureCors(
  app: INestApplication,
  configService: ConfigService,
) {
  const corsOriginsConfig = configService.get<string[] | string>(
    "app.corsOrigins",
  );
  const frontendUrl = configService.get<string>("app.frontendUrl");
  const isWildcard =
    corsOriginsConfig === "*" ||
    (Array.isArray(corsOriginsConfig) && corsOriginsConfig.includes("*"));

  const configuredOrigins = Array.isArray(corsOriginsConfig)
    ? corsOriginsConfig
    : typeof corsOriginsConfig === "string" && corsOriginsConfig !== "*"
      ? corsOriginsConfig.split(",").map((s) => s.trim())
      : [];

  const allowedOrigins = [
    ...configuredOrigins,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:4000",
  ];
  if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        isWildcard ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost(:[0-9]+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:[0-9]+)?$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-request-id",
      "x-school-id",
      "ngrok-skip-browser-warning",
    ],
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const formatErrors = (errs: typeof errors): any[] => {
        return errs.map((err) => {
          if (err.constraints) {
            return {
              field: err.property,
              errors: Object.values(err.constraints),
            };
          }
          if (err.children && err.children.length > 0) {
            return {
              field: err.property,
              children: formatErrors(err.children),
            };
          }
          return {
            field: err.property,
            errors: [`Validation failed for ${err.property}`],
          };
        });
      };

      return new BadRequestException({
        statusCode: 400,
        message: "Request validation failed",
        errorCode: "VALIDATION_FAILED",
        errors: formatErrors(errors),
      });
    },
  });
}
