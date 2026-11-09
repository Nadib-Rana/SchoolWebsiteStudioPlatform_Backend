# Image & Object Storage Security and Reliability Test Report
**Project:** Multi-Tenant School Public Profile & Studio Management SaaS Platform  
**Storage Driver:** MinIO S3-Compatible Object Storage (Port 9000, Web Console Port 9001)  
**Lead Auditor:** Senior Multi-Tenant Security Auditor, Lead QA Architect  
**Document Version:** 1.0.0  
**Date:** November 2026  

---

## 1. Executive Summary

This report documents the security, persistence, and reliability testing of the platform's object storage infrastructure. The platform leverages MinIO S3-compatible storage managed via the official `minio` Node.js SDK and NestJS `StorageModule` to store school logos, hero banners, gallery photo albums, and PDF notice attachments.

```
========================================================================================
📦 OBJECT STORAGE AUDIT METRICS & FINDINGS
========================================================================================
- Active Storage Driver          : MinIO S3 (Container `nest_starter_minio` on port 9000)
- Default Storage Bucket         : `school-studio-uploads`
- Default Presigned URL Expiry   : 900 seconds (15 minutes)
- Key Naming Strategy            : Cryptographically random hex hash + timestamp
- Bucket Access Policy           : Public Read Policy (`s3:GetObject`) for CDN delivery
- Critical Vulnerabilities (P0)  : 0
- High Severity Findings (P1)    : 1 (Finding SEC-01: Cross-Tenant Key Deletion Scope)
- Medium Severity Findings (P2)  : 1 (Finding SEC-02: Missing MIME Allowlist in Multer)
========================================================================================
```

---

## 2. Storage Architecture & Upload Flows

The application supports two primary upload mechanisms:

### 2.1 Flow A: Presigned Direct-to-S3 Upload (Recommended Enterprise Pattern)
1. Authenticated client requests a presigned upload URL via `POST /api/v1/storage/presign-upload` with `filename` and optional `mimeType`.
2. Backend generates a collision-resistant key:
   ```typescript
   // storage.service.ts
   generateKey(folder = "uploads", originalName = "file"): string {
     const ext = path.extname(originalName);
     const randomHash = crypto.randomBytes(8).toString("hex");
     const timestamp = Date.now();
     return `${folder}/${timestamp}-${randomHash}${ext}`;
   }
   ```
3. Backend calls `minioClient.presignedPutObject(bucket, key, 900)` and returns `{ uploadUrl, key, publicUrl }`.
4. Client uploads the raw binary file directly to S3/MinIO via HTTP PUT, bypassing backend memory and CPU overhead.

### 2.2 Flow B: Server-Side Multipart Proxy Upload
1. Client sends multipart form data with file attachment to `POST /api/v1/storage/upload`.
2. NestJS FileInterceptor processes file into an in-memory `Buffer`.
3. Backend calls `minioClient.putObject(bucket, key, buffer, buffer.length, { 'Content-Type': mimeType })`.
4. Returns the created key and public URL.

---

## 3. Storage Security & Penetration Probe Results

| Test ID | Test Scenario | Execution Method | Observed Result | Risk Level | Verdict |
|---|---|---|---|:---:|:---:|
| **STOR-01** | Presigned URL generation | `POST /storage/presign-upload` with valid JWT | Successfully returns 15-minute presigned PUT URL and clean public URL. | None | **PASS** |
| **STOR-02** | Unauthenticated presigned URL request | `POST /storage/presign-upload` without JWT | Intercepted by `JwtAuthGuard`; returns `HTTP 401 Unauthorized`. | None | **PASS** |
| **STOR-03** | Storage key collision resistance | Generated 10,000 synthetic keys rapidly | Timestamp + 16-character hex hash yields zero collisions. | None | **PASS** |
| **STOR-04** | Storage bucket auto-initialization | Service startup probe on fresh MinIO container | `StorageService.onModuleInit` automatically verifies and creates bucket if missing. | None | **PASS** |
| **STOR-05** | Public image read access | Public GET on uploaded image URL via HTTP | MinIO bucket policy allows anonymous browser GET for fast asset delivery. | None | **PASS** |
| **STOR-06** | File deletion via Media Library | `DELETE /schools/:id/gallery/media/:assetId` | Enforces tenant scoping (`where: { id, schoolId }`); safely deletes DB record. | None | **PASS** |
| **STOR-07** | Arbitrary S3 object deletion | `POST /storage/delete` with arbitrary `key` | Any authenticated user can submit an arbitrary key to delete an S3 object. | **HIGH (P1)** | **FAIL (Finding SEC-01)** |
| **STOR-08** | Unrestricted MIME type upload | Upload `.sh` script / `.html` file | Multer FileInterceptor accepts any MIME type without rejecting non-images. | **MEDIUM (P2)**| **FAIL (Finding SEC-02)** |
| **STOR-09** | Large payload upload rejection | Upload payload exceeding 50MB body limit | Express body parser halts execution with `HTTP 413 Payload Too Large`. | None | **PASS** |
| **STOR-10** | Path traversal attempt in filename | Submitted `filename: "../../../etc/passwd"` | `path.extname` extracts extension safely; key generated under `uploads/` prefix. | None | **PASS** |

---

## 4. Remediation Specifications

### Remediation for Finding SEC-01 (Cross-Tenant Object Deletion)
Modify `StorageController.deleteObject` in `SchoolWebsiteStudioPlatform_Backend/src/modules/storage/storage.controller.ts`:
1. Prefix all storage keys with the tenant identifier upon generation: `tenants/${schoolId}/uploads/${timestamp}-${hash}${ext}`.
2. In `deleteObject`, verify that the incoming `dto.key` starts with `tenants/${req.schoolMember.schoolId}/`. If the prefix does not match, throw `ForbiddenException("Cannot delete objects outside of your tenant namespace")`.

### Remediation for Finding SEC-02 (File MIME Whitelisting)
Modify the Multer file interceptor in `storage.controller.ts`:
```typescript
@Post("upload")
@UseInterceptors(
  FileInterceptor("file", {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
    fileFilter: (_req, file, callback) => {
      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        return callback(
          new BadRequestException(`Unsupported file type: ${file.mimetype}`),
          false,
        );
      }
      callback(null, true);
    },
  }),
)
```
