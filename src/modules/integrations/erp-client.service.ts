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
import { normalizeErpBaseUrl } from "./erp-crypto.util";

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
  previousSchool?: string;
  address?: string;
  documentsUrl?: string;
}

export interface ErpAdmissionApplyResponse {
  id?: string;
  applicationNumber: string;
  status: string;
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
  createdAt?: string;
  updatedAt?: string;
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
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly REQUEST_TIMEOUT_MS = 10_000; // 10 seconds

  clearClassesCache(schoolId?: string) {
    if (schoolId) {
      this.classesCache.delete(schoolId);
    } else {
      this.classesCache.clear();
    }
  }

  async testConnection(
    baseUrl: string,
    apiKey: string,
  ): Promise<ErpTestResponse> {
    const normalizedBase = normalizeErpBaseUrl(baseUrl);
    if (!normalizedBase) {
      throw new BadRequestException("ERP Base URL is required.");
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
      }));

    this.classesCache.set(schoolId, {
      data: classes,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return classes;
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
    tenantId: string,
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
          ? `Could not reach ERP server at ${url}. Please verify the ERP Base URL and network connectivity.`
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

