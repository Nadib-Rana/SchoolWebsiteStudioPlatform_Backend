import { UnauthorizedException, HttpStatus } from "@nestjs/common";
import { AllExceptionsFilter } from "./all-exceptions.filter";
import { RequestIdMiddleware } from "../middleware/request-id.middleware";

describe("Structured Logging & Error Response Verification", () => {
  describe("AllExceptionsFilter", () => {
    it("should format UnauthorizedException to exact user schema", () => {
      const replyMock = jest.fn();
      const httpAdapterMock = {
        reply: replyMock,
        getRequestUrl: jest.fn().mockReturnValue("/api/v1/auth/login"),
      };
      const contextServiceMock = {
        getRequestId: jest.fn().mockReturnValue("test-req-id"),
      };

      const filter = new AllExceptionsFilter(
        { httpAdapter: httpAdapterMock } as any,
        contextServiceMock as any,
      );

      const hostMock = {
        switchToHttp: () => ({
          getRequest: () => ({ url: "/api/v1/auth/login" }),
          getResponse: () => ({}),
        }),
      };

      const exception = new UnauthorizedException(
        "Access Denied: Your account role is not authorized to log in through this portal.",
      );

      filter.catch(exception, hostMock as any);

      expect(replyMock).toHaveBeenCalledWith(
        {},
        [
          {
            code: "UnauthorizedException",
            message:
              "Access Denied: Your account role is not authorized to log in through this portal.",
          },
        ],
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe("RequestIdMiddleware", () => {
    it("should log single-line structured JSON matching exact fields", (done) => {
      const middleware = new RequestIdMiddleware();
      let finishCallback: () => void = () => {};

      const reqMock: any = {
        headers: {
          "cf-connecting-ip": "172.69.159.152",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "content-length": "101",
        },
        method: "POST",
        url: "/api/v1/auth/login",
        originalUrl: "/api/v1/auth/login",
      };

      const resHeaders: Record<string, any> = {
        "content-length": "384",
      };

      const resMock: any = {
        statusCode: 401,
        setHeader: jest.fn((k, v) => {
          resHeaders[k] = v;
        }),
        getHeader: jest.fn((k) => resHeaders[k]),
        on: jest.fn((event, cb) => {
          if (event === "finish") finishCallback = cb;
        }),
        write: jest.fn(),
        end: jest.fn(),
      };

      const consoleSpy = jest.spyOn(console, "log").mockImplementation((str) => {
        try {
          const parsed = JSON.parse(str);
          expect(parsed).toHaveProperty("correlationId");
          expect(parsed.ip).toBe("172.69.159.152");
          expect(parsed.isSlowApi).toBe(false);
          expect(typeof parsed.latency).toBe("number");
          expect(parsed.level).toBe("warn");
          expect(parsed.message).toBe("POST /api/v1/auth/login - 401");
          expect(parsed.method).toBe("POST");
          expect(parsed.platform).toBe("web");
          expect(parsed.requestSize).toBe(101);
          expect(parsed.responseSize).toBe(384);
          expect(parsed.service).toBe("school-erp-api");
          expect(parsed.statusCode).toBe(401);
          expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
          expect(parsed.url).toBe("/api/v1/auth/login");
          consoleSpy.mockRestore();
          done();
        } catch (e) {
          consoleSpy.mockRestore();
          done(e);
        }
      });

      middleware.use(reqMock, resMock, () => {
        finishCallback();
      });
    });
  });
});
