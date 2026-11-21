import * as crypto from "crypto";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from "@nestjs/common";
import { ErpClientService } from "./erp-client.service";
import {
  buildIdempotencyKey,
  decryptSecret,
  encryptSecret,
  maskApiKey,
  normalizeErpBaseUrl,
  verifyHmacSha256Signature,
} from "./erp-crypto.util";

describe("ERP Crypto & Client Utilities", () => {
  describe("erp-crypto.util", () => {
    it("encrypts and decrypts API keys round-trip", () => {
      const rawKey = "sk_web_live_1234567890abcdef";
      const encrypted = encryptSecret(rawKey);
      expect(encrypted).not.toBe(rawKey);
      expect(encrypted.split(":")).toHaveLength(3);
      expect(decryptSecret(encrypted)).toBe(rawKey);
    });

    it("masks API keys safely", () => {
      expect(maskApiKey("sk_web_1234567890abcd")).toBe("sk_web_••••abcd");
    });

    it("normalizes ERP base URLs to include /api/v1", () => {
      expect(normalizeErpBaseUrl("https://erp.school.edu.bd/")).toBe(
        "https://erp.school.edu.bd/api/v1",
      );
      expect(normalizeErpBaseUrl("https://erp.school.edu.bd/api/v1/")).toBe(
        "https://erp.school.edu.bd/api/v1",
      );
    });

    it("verifies HMAC-SHA256 webhook signatures and builds deterministic idempotency keys", () => {
      const secret = "whsec_test_secret_123";
      const body = JSON.stringify({
        event: "admission.status_updated",
        data: { applicationNumber: "ADM-2026-0001", status: "APPROVED" },
      });
      const sig = `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
      expect(verifyHmacSha256Signature(body, secret, sig)).toBe(true);
      expect(verifyHmacSha256Signature(body, secret, "sha256=invalid")).toBe(
        false,
      );

      const k1 = buildIdempotencyKey(["school-1", "Arafat", "01711000000"]);
      const k2 = buildIdempotencyKey(["school-1", " arafat ", "01711000000"]);
      expect(k1).toBe(k2);
      expect(k1.length).toBe(32);
    });
  });

  describe("ErpClientService", () => {
    let service: ErpClientService;
    const originalFetch = global.fetch;

    beforeEach(() => {
      service = new ErpClientService();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("tests ERP connection with x-website-key header", async () => {
      const mockResponse = {
        connected: true,
        tenantId: "tenant-123",
        schoolName: "Greenfield Academy",
        subdomain: "greenfield",
        openClassesCount: 8,
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      } as any);

      const res = await service.testConnection(
        "https://erp.school.edu.bd",
        "sk_web_test_key",
      );
      expect(res.connected).toBe(true);
      expect(res.tenantId).toBe("tenant-123");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://erp.school.edu.bd/api/v1/admissions/website-integration/test",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-website-key": "sk_web_test_key",
          }),
        }),
      );
    });

    it("maps 400, 401, 403, and 429 ERP errors accurately", async () => {
      const cases: Array<[number, any, boolean]> = [
        [400, BadRequestException, false],
        [401, UnauthorizedException, true],
        [403, ForbiddenException, true],
        [429, HttpException, false],
      ];

      for (const [status, ExceptionType, isAdmin] of cases) {
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status,
          statusText: "Error",
          text: async () => JSON.stringify({ message: "ERP error" }),
        } as any);

        const call = isAdmin
          ? service.testConnection("https://erp.test", "sk_web_key")
          : service.trackAdmission("https://erp.test", "sk_web_key", "ADM-1", "01711");

        await expect(call).rejects.toThrow(ExceptionType);
      }
    });

    it("blocks private/loopback/metadata SSRF URLs in ERP requests", async () => {
      const unsafeUrls = [
        "http://127.0.0.1:4000",
        "http://localhost:8080",
        "http://169.254.169.254/latest/meta-data",
        "http://10.0.0.5/api/v1",
        "http://192.168.1.1/api/v1",
      ];
      for (const badUrl of unsafeUrls) {
        await expect(
          service.testConnection(badUrl, "sk_web_test"),
        ).rejects.toThrow(BadRequestException);
      }
    });
  });
});

