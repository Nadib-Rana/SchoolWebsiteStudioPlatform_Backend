import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  BadGatewayException,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { normalizeErpBaseUrl, isUnsafePrivateHost } from "./erp-crypto.util";

export interface ErpTestResponse {
  connected: boolean;
  tenantId: string;
  schoolName: string;
  subdomain?: string;
  openClassesCount?: number;
}

export interface ErpClassItem {
  id: string;
  name: string;
  section?: string;
  capacity?: number;
  admissionFee?: number;
  [key: string]: any;
}

export interface ErpAdmissionApplyPayload {
  firstName: string;
  lastName: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  guardianName: string;
  guardianPhone: string;
  appliedClassId?: string;
  email?: string;
  guardianEmail?: string;
  relationship?: string;
  bloodGroup?: string;
  birthRegistrationNo?: string;
  fatherName?: string;
  motherName?: string;
  previousSchool?: string;
  address?: string;
  presentAddress?: string;
  permanentAddress?: string;
  documentsUrl?: string;
  photoUrl?: string;
}

export interface ErpAdmissionApplyResponse {
  id?: string;
  applicationNumber: string;
  status: string;
  feeAmount?: number;
  paymentStatus?: string;
  currency?: string;
  [key: string]: any;
}

export interface ErpTrackResponse {
  applicationNumber?: string;
  status: string;
  studentName?: string;
  firstName?: string;
  lastName?: string;
  appliedClass?: { id?: string; name?: string } | string;
  appliedClassName?: string;
  interviewDate?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  remarks?: string | null;
  feeAmount?: number;
  paymentStatus?: string;
  paymentMethod?: string | null;
  transactionId?: string | null;
  paymentNote?: string | null;
  paidAt?: string | null;
  currency?: string;
  photoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface ErpFeeConfig {
  enabled: boolean;
  currency: string;
  defaultFee: number;
  classFees: Record<string, number>;
  allowOnlinePayment: boolean;
  allowManualPayment: boolean;
  manualInstructions?: string;
  activeGateways: string[];
}

export interface ErpPayOnlinePayload {
  applicationNumber: string;
  identifier: string;
  gateway: string;
  callbackBaseUrl: string;
}

export interface ErpPayOnlineResponse {
  gateway: string;
  applicationNumber: string;
  feeAmount: number;
  currency: string;
  redirectUrl: string;
  transactionId: string;
  mode?: string;
  [key: string]: any;
}

export interface ErpVerifyOnlinePaymentPayload {
  applicationNumber: string;
  identifier: string;
  gateway: string;
  transactionId?: string;
  valId?: string;
  paymentID?: string;
}

export interface ErpVerifyOnlinePaymentResponse {
  verified: boolean;
  applicationNumber?: string;
  paymentStatus: string;
  paymentMethod?: string;
  transactionId?: string;
  feeAmount?: number;
  paidAt?: string;
  [key: string]: any;
}

export interface ErpPayManualPayload {
  applicationNumber: string;
  identifier: string;
  paymentMethod: string;
  transactionId: string;
  paymentNote?: string;
}

export interface ErpPayManualResponse {
  paymentStatus: string;
  feeAmount?: number;
  transactionId?: string;
  paymentMethod?: string;
  [key: string]: any;
}

export interface ErpAlumniVerifyResponse {
  verified?: boolean;
  valid?: boolean;
  [key: string]: any;
}

export interface ErpPublicTeacher {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  designation?: string;
  department?: string;
  qualification?: string;
  photoUrl?: string;
  avatarUrl?: string;
  bio?: string;
  [key: string]: any;
}

export interface ErpPublicNotice {
  id?: string;
  title: string;
  slug?: string;
  category?: string;
  description?: string;
  content?: string;
  fileUrl?: string;
  attachmentUrl?: string;
  isPinned?: boolean;
  priority?: string;
  publishDate?: string;
  createdAt?: string;
  expiryDate?: string;
  [key: string]: any;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class ErpClientService {
  private readonly logger = new Logger(ErpClientService.name);
  private readonly classesCache = new Map<string, CacheEntry<ErpClassItem[]>>();
  private readonly feeConfigCache = new Map<string, CacheEntry<ErpFeeConfig>>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly FEE_CONFIG_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
  private readonly REQUEST_TIMEOUT_MS = 10_000; // 10 seconds

  clearClassesCache(schoolId?: string) {
    if (schoolId) {
      this.classesCache.delete(schoolId);
      this.feeConfigCache.delete(schoolId);
    } else {
      this.classesCache.clear();
      this.feeConfigCache.clear();
    }
  }

  async testConnection(
    baseUrl: string,
    apiKey: string,
  ): Promise<ErpTestResponse> {
    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    if (!normalizedBase) {
      throw new BadRequestException(
        "ERP server endpoint is not configured on the platform.",
      );
    }
    if (!apiKey?.trim()) {
      throw new BadRequestException("ERP Website API Key is required.");
    }

    const res = await this.request<ErpTestResponse>(
      `${normalizedBase}/admissions/website-integration/test`,
      {
        method: "POST",
        apiKey: apiKey.trim(),
        isAdminContext: true,
      },
    );

    return res;
  }

  async getPublicClasses(
    baseUrl: string,
    apiKey: string,
    schoolId: string,
    forceRefresh = false,
  ): Promise<ErpClassItem[]> {
    const cached = this.classesCache.get(schoolId);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    const res = await this.request<any>(
      `${normalizedBase}/admissions/public/classes`,
      {
        method: "GET",
        apiKey: apiKey.trim(),
        isAdminContext: false,
      },
    );

    const rawList = Array.isArray(res)
      ? res
      : Array.isArray(res?.classes)
        ? res.classes
        : Array.isArray(res?.data?.classes)
          ? res.data.classes
          : Array.isArray(res?.data)
            ? res.data
            : [];

    const classes: ErpClassItem[] = rawList
      .filter((item: any) => item && (item.id || item.name))
      .map((item: any) => ({
        id: String(item.id ?? item.name),
        name: String(item.name ?? item.title ?? item.className ?? item.id),
        ...(item.section ? { section: item.section } : {}),
        ...(item.capacity !== undefined ? { capacity: item.capacity } : {}),
        ...(item.admissionFee !== undefined
          ? { admissionFee: Number(item.admissionFee) }
          : {}),
      }));

    this.classesCache.set(schoolId, {
      data: classes,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return classes;
  }

  async getPublicFeeConfig(
    baseUrl: string,
    apiKey: string,
    schoolId: string,
    forceRefresh = false,
  ): Promise<ErpFeeConfig> {
    const cached = this.feeConfigCache.get(schoolId);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    const res = await this.request<any>(
      `${normalizedBase}/admissions/public/fee-config`,
      {
        method: "GET",
        apiKey: apiKey.trim(),
        isAdminContext: false,
      },
    );

    const data = res?.data ?? res ?? {};
    const config: ErpFeeConfig = {
      enabled: Boolean(data.enabled),
      currency: String(data.currency || "BDT"),
      defaultFee: Number(data.defaultFee ?? 0),
      classFees:
        data.classFees && typeof data.classFees === "object"
          ? data.classFees
          : {},
      allowOnlinePayment: Boolean(data.allowOnlinePayment),
      allowManualPayment: Boolean(data.allowManualPayment),
      ...(data.manualInstructions
        ? { manualInstructions: String(data.manualInstructions) }
        : {}),
      activeGateways: Array.isArray(data.activeGateways)
        ? data.activeGateways.map((g: any) => String(g))
        : [],
    };

    this.feeConfigCache.set(schoolId, {
      data: config,
      expiresAt: Date.now() + this.FEE_CONFIG_CACHE_TTL_MS,
    });

    return config;
  }

  async initiateOnlinePayment(
    baseUrl: string,
    apiKey: string,
    payload: ErpPayOnlinePayload,
  ): Promise<ErpPayOnlineResponse> {
    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    const res = await this.request<any>(
      `${normalizedBase}/admissions/public/pay-online`,
      {
        method: "POST",
        apiKey: apiKey.trim(),
        body: payload,
        isAdminContext: false,
      },
    );
    return res?.data ?? res;
  }

  async verifyOnlinePayment(
    baseUrl: string,
    apiKey: string,
    payload: ErpVerifyOnlinePaymentPayload,
  ): Promise<ErpVerifyOnlinePaymentResponse> {
    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    const res = await this.request<any>(
      `${normalizedBase}/admissions/public/verify-online-payment`,
      {
        method: "POST",
        apiKey: apiKey.trim(),
        body: payload,
        isAdminContext: false,
      },
    );
    return res?.data ?? res;
  }

  async submitManualPayment(
    baseUrl: string,
    apiKey: string,
    payload: ErpPayManualPayload,
  ): Promise<ErpPayManualResponse> {
    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    const res = await this.request<any>(
      `${normalizedBase}/admissions/public/pay-manual`,
      {
        method: "POST",
        apiKey: apiKey.trim(),
        body: payload,
        isAdminContext: false,
      },
    );
    return res?.data ?? res;
  }

  async submitAdmission(
    baseUrl: string,
    apiKey: string,
    payload: ErpAdmissionApplyPayload,
    idempotencyKey?: string,
  ): Promise<ErpAdmissionApplyResponse> {
    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    const res = await this.request<any>(`${normalizedBase}/admissions/apply`, {
      method: "POST",
      apiKey: apiKey.trim(),
      body: payload,
      extraHeaders: idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : undefined,
      isAdminContext: false,
    });

    const data = res?.data ?? res;
    return {
      ...data,
      id: data?.id,
      applicationNumber: data?.applicationNumber,
      status: data?.status || "PENDING",
    };
  }

  async trackAdmission(
    baseUrl: string,
    apiKey: string,
    applicationNumber: string,
    identifier: string,
  ): Promise<ErpTrackResponse> {
    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    const res = await this.request<any>(`${normalizedBase}/admissions/track`, {
      method: "POST",
      apiKey: apiKey.trim(),
      body: {
        applicationNumber: applicationNumber.trim(),
        identifier: identifier.trim(),
      },
      isAdminContext: false,
    });

    return res?.data ?? res;
  }

  async verifyAlumni(
    baseUrl: string,
    apiKey: string,
    tenantId: string | undefined,
    code: string,
  ): Promise<ErpAlumniVerifyResponse> {
    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    const params = new URLSearchParams({
      code: code.trim(),
      ...(tenantId?.trim() ? { tenantId: tenantId.trim() } : {}),
    });
    const res = await this.request<any>(
      `${normalizedBase}/alumni/verify?${params.toString()}`,
      {
        method: "GET",
        apiKey: apiKey.trim(),
        isAdminContext: false,
      },
    );

    return res?.data ?? res;
  }

  async getPublicTeachers(
    baseUrl: string,
    apiKey: string,
  ): Promise<ErpPublicTeacher[]> {
    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    const res = await this.request<any>(`${normalizedBase}/public/teachers`, {
      method: "GET",
      apiKey: apiKey.trim(),
      isAdminContext: true,
    });

    const raw = Array.isArray(res)
      ? res
      : Array.isArray(res?.teachers)
        ? res.teachers
        : Array.isArray(res?.data?.teachers)
          ? res.data.teachers
          : Array.isArray(res?.data)
            ? res.data
            : [];
    return raw;
  }

  async getPublicNotices(
    baseUrl: string,
    apiKey: string,
  ): Promise<ErpPublicNotice[]> {
    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    const res = await this.request<any>(`${normalizedBase}/public/notices`, {
      method: "GET",
      apiKey: apiKey.trim(),
      isAdminContext: true,
    });

    const raw = Array.isArray(res)
      ? res
      : Array.isArray(res?.notices)
        ? res.notices
        : Array.isArray(res?.data?.notices)
          ? res.data.notices
          : Array.isArray(res?.data)
            ? res.data
            : [];
    return raw;
  }

  private async request<T>(
    url: string,
    options: {
      method: "GET" | "POST";
      apiKey: string;
      body?: Record<string, any>;
      extraHeaders?: Record<string, string>;
      isAdminContext: boolean;
    },
  ): Promise<T> {
    const isProd = process.env.NODE_ENV === "production";
    if (isUnsafePrivateHost(url)) {
      throw new BadRequestException(
        "ERP Base URL must be a valid public HTTPS/HTTP host (private/local network addresses are blocked).",
      );
    }
    if (isProd && !url.startsWith("https://")) {
      throw new BadRequestException(
        "ERP Base URL must use HTTPS in production.",
      );
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-website-key": options.apiKey,
      ...(options.extraHeaders || {}),
    };

    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      });
    } catch (error: any) {
      this.logger.error(`ERP network error calling ${url}: ${error?.message}`);
      throw new BadGatewayException(
        options.isAdminContext
          ? "Could not reach the School ERP server right now. Please try again shortly or contact platform support."
          : "The school admission server is temporarily unreachable. Please try again shortly.",
      );
    }

    const rawText = await response.text();
    let parsed: any = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = { message: rawText };
    }

    if (response.ok) {
      return (parsed ?? {}) as T;
    }

    const erpMessage = parsed?.message;
    const messageStr = Array.isArray(erpMessage)
      ? erpMessage.join(", ")
      : typeof erpMessage === "string"
        ? erpMessage
        : response.statusText || "ERP request failed";

    this.logger.warn(
      `ERP returned HTTP ${response.status} for ${url}: ${messageStr}`,
    );

    switch (response.status) {
      case 400:
        throw new BadRequestException(erpMessage || "Invalid request data.");
      case 401:
        if (options.isAdminContext) {
          throw new UnauthorizedException(
            "Invalid or revoked ERP Website API Key (x-website-key).",
          );
        }
        throw new BadGatewayException(
          "School ERP integration authentication failed. Please contact the school administrator.",
        );
      case 403:
        if (options.isAdminContext) {
          throw new ForbiddenException(
            messageStr ||
              "ERP Website Integration is disabled or this website domain is not in Allowed Origins.",
          );
        }
        throw new ForbiddenException(
          "Online admission integration is currently disabled for this school.",
        );
      case 404:
        throw new HttpException(
          messageStr || "Record not found in school ERP.",
          HttpStatus.NOT_FOUND,
        );
      case 429:
        throw new HttpException(
          "Too many requests. Please wait a minute and try again.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      default:
        throw new BadGatewayException(
          options.isAdminContext
            ? `ERP server responded with status ${response.status}: ${messageStr}`
            : "Unable to complete request with the school ERP right now. Please try again later.",
        );
    }
  }
}

