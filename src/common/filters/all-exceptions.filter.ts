import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Request } from "express";
import { ContextService } from "../context/context.service";
import { ApiErrorResponseDto } from "../dto/api-error-response.dto";
import { BaseException } from "../exceptions/base.exception";

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly contextService: ContextService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = "Internal server error";
    let errorCode = "InternalServerError";

    if (exception instanceof BaseException) {
      statusCode = exception.getStatus();
      errorCode = exception.code || exception.constructor.name || "BaseException";
      const res = exception.getResponse() as any;
      message = typeof res === "string" ? res : res.message || message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorCode = (exception as any)?.constructor?.name || "HttpException";
      const res = exception.getResponse() as any;
      message = typeof res === "string" ? res : res.message || message;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = exception.name || "Error";
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse = Array.isArray(message)
      ? message.map((msg) => ({
          code: errorCode,
          message: typeof msg === "string" ? msg : JSON.stringify(msg),
        }))
      : [
          {
            code: errorCode,
            message:
              typeof message === "string"
                ? message
                : JSON.stringify(message) || "An unexpected error occurred",
          },
        ];

    httpAdapter.reply(ctx.getResponse(), errorResponse, statusCode);
  }
}
