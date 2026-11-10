import { INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(
  app: INestApplication,
  configService: ConfigService,
  logger: Logger,
  appName: string,
  port: number,
) {
  const swaggerEnabled = configService.get<boolean>("swagger.enabled", true);
  if (!swaggerEnabled) return;

  const swaggerPath = configService.get<string>("swagger.path", "docs");
  const swaggerTitle = configService.get<string>("swagger.title", appName);
  const swaggerDescription = configService.get<string>(
    "swagger.description",
    "Production-ready NestJS RESTful API Starter Template",
  );
  const swaggerVersion = configService.get<string>(
    "swagger.version",
    "1.0.0",
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .setDescription(
      `${swaggerDescription}\n\n` +
        `### Features Included:\n` +
        `- **JWT Authentication & Refresh Tokens** with rotation\n` +
        `- **Role-Based Access Control (RBAC)** (\`SUPER_ADMIN\`, \`ADMIN\`, \`USER\`, \`MODERATOR\`)\n` +
        `- **Prisma ORM & PostgreSQL** persistence\n` +
        `- **Object Storage Integration** (MinIO / S3)\n` +
        `- **Email Dispatcher** with Handlebars templates\n` +
        `- **Standardized Response Envelope** & Custom Exception Filters\n` +
        `- **Health & Readiness Probes**\n`,
    )
    .setVersion(swaggerVersion)
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        description: "Enter your JWT Bearer token",
        in: "header",
      },
      "bearer",
    )
    .addTag(
      "Authentication",
      "User registration, login, refresh token, OTP, and password reset",
    )
    .addTag("Users", "User profile and account administration")
    .addTag(
      "Posts",
      "Reference CRUD module with search, tags, pagination, and RBAC",
    )
    .addTag(
      "Storage",
      "MinIO/S3 object storage, presigned upload/download URLs",
    )
    .addTag("Health", "System health and service connectivity probes")
    .addTag("General", "Core application metadata")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
      filter: true,
    },
  });

  logger.log(
    `📚 Swagger documentation available at: http://localhost:${port}/${swaggerPath}`,
  );
}
