/**
 * src/common/context/context.service.ts
 * * Provides a clean, injectable service to get/set values
 * in the AsyncLocalStorage store.
 */
import { Injectable, Logger } from "@nestjs/common";
import { requestContext, RequestContextStore } from "./storage";

// Define constant keys for our request context
export const REQUEST_ID_KEY = "requestId";
export const CORRELATION_ID_KEY = "correlationId";

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  private getStore(): RequestContextStore {
    const store = requestContext.getStore();
    if (!store) {
      // This should not happen if the middleware is set up correctly
      this.logger.warn(
        "AsyncLocalStorage store not found. Middleware may be missing.",
      );
      // Return a dummy map to prevent crashes, though this indicates an issue.
      return new Map();
    }
    return store;
  }

  /**
   * Gets a value from the request context store.
   * @param key The key to retrieve.
   */
  get<T>(key: string): T | undefined {
    return this.getStore().get(key) as T | undefined;
  }
  /**
   * Sets a value in the request context store.
   * @param key The key to set.
   * @param value The value to store.
   */
  set<T>(key: string, value: T): void {
    this.getStore().set(key, value);
  }

  /**
   * A convenience method to get the request ID.
   */
  getRequestId(): string | undefined {
    return this.get(REQUEST_ID_KEY);
  }

  /**
   * A convenience method to get the correlation ID.
   */
  getCorrelationId(): string | undefined {
    return this.get(CORRELATION_ID_KEY) || this.getRequestId();
  }
}
