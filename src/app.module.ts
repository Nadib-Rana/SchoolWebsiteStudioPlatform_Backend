import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

// Configurations
import { configurations } from "./config";

// Database & Context
import { PrismaModule } from "./database/prisma.module";
import { ContextModule } from "./common/context/context.module";

// Middlewares, Filters & Interceptors
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { ResponseStandardizationInterceptor } from "./common/interceptors/response-standardization.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { PrismaClientExceptionFilter } from "./common/filters/prisma-client-exception.filter";

// Feature Modules
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { StorageModule } from "./modules/storage/storage.module";
import { MailModule } from "./modules/mail/mail.module";
import { HealthModule } from "./modules/health/health.module";
import { PostsModule } from "./modules/posts/posts.module";

// App Core Controller & Service
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
      envFilePath: [".env", ".env.local"],
    }),

    // Global Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: (config.get<number>("throttler.ttl") || 60) * 1000,
          limit: config.get<number>("throttler.limit") || 100,
        },
      ],
    }),

    // Global Core Modules
    ContextModule,
    PrismaModule,
    MailModule,
    StorageModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    HealthModule,
    PostsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Reflector,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseStandardizationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
