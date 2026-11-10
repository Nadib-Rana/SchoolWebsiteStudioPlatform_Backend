import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { configureCors, createValidationPipe } from "./config/bootstrap.util";
import { setupSwagger } from "./config/swagger.setup";

// Ensure BigInt values (e.g. storage limits, file bytes) serialize cleanly to JSON
(BigInt.prototype as any).toJSON = function () {
  const num = Number(this);
  return Number.isSafeInteger(num) ? num : this.toString();
};

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("app.port", 3000);
  const apiPrefix = configService.get<string>("app.apiPrefix", "api/v1");
  const appName = configService.get<string>(
    "app.name",
    "Nest Starter Template",
  );
  const isProd = configService.get<string>("app.nodeEnv") === "production";

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: isProd ? undefined : false,
    }),
  );

  // 2. Body Parser Limit
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  // 3. CORS Setup
  configureCors(app, configService);

  // 4. Global API Prefix
  app.setGlobalPrefix(apiPrefix, {
    exclude: ["/", "docs", "docs-json"],
  });

  // 5. Global Validation Pipe
  app.useGlobalPipes(createValidationPipe());

  // 6. Swagger OpenAPI Setup
  setupSwagger(app, configService, logger, appName, port);

  // 7. Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(
    `🚀 ${appName} server running at: http://localhost:${port}/${apiPrefix}`,
  );
}

void bootstrap();
