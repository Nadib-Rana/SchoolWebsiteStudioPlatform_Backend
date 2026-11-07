import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { requestContext, RequestContextStore } from "../context/storage";
import { REQUEST_ID_KEY, CORRELATION_ID_KEY } from "../context/context.service";
import { randomUUID } from "crypto";

function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getClientIp(req: Request): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (cfIp) return Array.isArray(cfIp) ? cfIp[0] : cfIp;

  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) {
    const raw = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    return raw.split(",")[0].trim();
  }

  const rawIp = req.ip || req.socket?.remoteAddress || "127.0.0.1";
  return rawIp.replace(/^::ffff:/, "");
}

function getPlatform(req: Request): string {
  const platformHeader = req.headers["x-platform"];
  if (platformHeader) {
    return Array.isArray(platformHeader)
      ? platformHeader[0].toLowerCase()
      : platformHeader.toLowerCase();
  }
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  if (/mobile|android|iphone|ipad|tablet|ipod/i.test(userAgent)) {
    return "mobile";
  }
  return "web";
}

function getRequestSize(req: Request): number {
  const cl = req.headers["content-length"];
  if (cl) {
    const parsed = parseInt(Array.isArray(cl) ? cl[0] : cl, 10);
    if (!isNaN(parsed)) return parsed;
  }
  if (req.body && Object.keys(req.body).length > 0) {
    try {
      return Buffer.byteLength(JSON.stringify(req.body));
    } catch {
      return 0;
    }
  }
  return 0;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers["x-correlation-id"] as string) ||
      (req.headers["x-request-id"] as string) ||
      randomUUID();

    const store: RequestContextStore = new Map();
    store.set(REQUEST_ID_KEY, correlationId);
    store.set(CORRELATION_ID_KEY, correlationId);

    res.setHeader("x-request-id", correlationId);
    res.setHeader("x-correlation-id", correlationId);

    const startTime = Date.now();
    const clientIp = getClientIp(req);
    const platform = getPlatform(req);
    const requestSize = getRequestSize(req);
    const url = req.originalUrl || req.url;

    let responseSize = 0;
    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function (chunk: any, ...args: any[]): boolean {
      if (chunk) {
        responseSize += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk);
      }
      return (originalWrite as any).apply(res, [chunk, ...args]);
    };

    res.end = function (chunk: any, ...args: any[]): any {
      if (chunk) {
        responseSize += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk);
      }
      return (originalEnd as any).apply(res, [chunk, ...args]);
    };

    res.on("finish", () => {
      const latency = Date.now() - startTime;
      const statusCode = res.statusCode;
      const level =
        statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

      const cl = res.getHeader("content-length");
      if (cl) {
        const parsed = parseInt(String(cl), 10);
        if (!isNaN(parsed) && parsed > 0) {
          responseSize = parsed;
        }
      }

      const logEntry = {
        correlationId,
        ip: clientIp,
        isSlowApi: latency > 500,
        latency,
        level,
        message: `${req.method} ${url} - ${statusCode}`,
        method: req.method,
        platform,
        requestSize,
        responseSize,
        service: "school-erp-api",
        statusCode,
        timestamp: formatTimestamp(),
        url,
      };

      console.log(JSON.stringify(logEntry));
    });

    requestContext.run(store, () => {
      next();
    });
  }
}
