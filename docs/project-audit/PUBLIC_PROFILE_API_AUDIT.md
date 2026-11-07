# Public School Profile Platform - API & Backend Architecture Audit

**Audit Date:** November 2026  
**Auditors:** Principal Backend Architect, API Security Lead, QA Engineer  
**Framework:** NestJS 11 + Prisma 7 + PostgreSQL 17 (`SchoolWebsiteStudioPlatform_Backend`)

---

## 1. API Architecture Overview

The backend is built as a modular RESTful NestJS application exposing endpoints prefixed with `/api/v1` (configured via `APP_PREFIX`).

### Core Infrastructure Components:
- **Global Validation Pipe:** `new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })` in `main.ts`.
- **Response Envelope:** Intercepted by `ResponseStandardizationInterceptor` returning:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Operation successful",
    "data": { ... },
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
  ```
- **Error Filtering:** `AllExceptionsFilter` and `PrismaClientExceptionFilter` formatting standard error schemas.
- **Rate Limiting:** Global `ThrottlerGuard` configured in `AppModule` with 100 requests per 60 seconds (configurable via `.env`).
- **Swagger Documentation:** Configured at `/docs` with Bearer auth support.

---

## 2. Complete API Endpoint Inventory (99 Endpoints)

| Method | Endpoint | Module | Auth Guard | Tenant Guard & RBAC | Status | Audit Findings & Security Notes |
|---|---|---|---|---|---|---|
| `GET` | `/` | Core | `@Public()` | None | **Complete** | Returns basic application health and metadata. |
| `GET` | `/health` | Health | `@Public()` | None | **Complete** | Health probe checking DB, storage, and memory. |
| `POST` | `/auth/register` | Auth | `@Public()` | None | **Complete** | Creates user with `Role.USER`, hashes password with bcrypt, sends email OTP. |
| `POST` | `/auth/login` | Auth | `@Public()` | None | **Complete** | Validates credentials, issues JWT access + refresh tokens, records last login. |
| `POST` | `/auth/refresh` | Auth | `@Public()` | None | **Complete** | Rotates refresh token in DB, invalidates old token hash. |
| `POST` | `/auth/verify-email` | Auth | `@Public()` | None | **Complete** | Verifies 6-digit numeric OTP, marks `isEmailVerified = true`. |
| `POST` | `/auth/resend-otp` | Auth | `@Public()` | None | **Complete** | Regenerates email verification OTP. |
| `POST` | `/auth/forgot-password`| Auth | `@Public()` | None | **Complete** | Dispatches password reset OTP via Handlebars mailer. |
| `POST` | `/auth/reset-password` | Auth | `@Public()` | None | **Complete** | Validates reset OTP, hashes new password, revokes active refresh tokens. |
| `GET` | `/auth/me` | Auth | `JwtAuthGuard` | None | **Complete** | Retrieves authenticated user profile and associated school memberships. |
| `POST` | `/auth/change-password`| Auth | `JwtAuthGuard` | None | **Complete** | Compares current password hash and updates password. |
| `POST` | `/auth/logout` | Auth | `JwtAuthGuard` | None | **Complete** | Revokes active refresh token for user. |
| `GET` | `/users` | Users | `JwtAuthGuard` | `@Roles(SUPER_ADMIN, ADMIN)` | **Broken Isolation**| Platform `ADMIN` can view all users across all schools. School admins given platform admin in seed. |
| `GET` | `/users/:id` | Users | `JwtAuthGuard` | `@Roles(SUPER_ADMIN, ADMIN)` | **Broken Isolation**| Allows school admins to view user records across other schools. |
| `POST` | `/users` | Users | `JwtAuthGuard` | `@Roles(SUPER_ADMIN, ADMIN)` | **Broken Isolation**| Can create platform users with arbitrary roles. |
| `PATCH` | `/users/profile` | Users | `JwtAuthGuard` | Any authenticated | **Complete** | Updates self profile (names, avatar, phone). |
| `PATCH` | `/users/:id` | Users | `JwtAuthGuard` | `@Roles(SUPER_ADMIN, ADMIN)` | **Broken Isolation**| Can modify user roles or status platform-wide. |
| `DELETE`| `/users/:id` | Users | `JwtAuthGuard` | `@Roles(SUPER_ADMIN)` | **Complete** | Soft-deletes user (`deletedAt = now()`). Restricted to Super Admin. |
| `POST` | `/storage/presign-upload` | Storage | `@Public()` | None | **Security Risk** | Anyone can generate presigned upload URLs for any bucket without authentication. |
| `POST` | `/storage/presign-download` | Storage | `@Public()` | None | **Security Risk** | Presigned download generation open to unauthenticated users. |
| `POST` | `/storage/upload` | Storage | `JwtAuthGuard` | None | **Broken Architecture**| Multipart upload saves file to MinIO, but creates NO `MediaAsset` record in PostgreSQL. No `schoolId` tracking. |
| `POST` | `/storage/delete` | Storage | `JwtAuthGuard` | None | **High Security Risk**| Authenticated user can delete ANY key from MinIO without checking school ownership. |
| `GET` | `/public/site` | Public | `@Public()` | Resolves slug/host | **Partially Implemented**| Bulk delivery of published pages, teachers, notices, events, albums. Hardcoded limits (`take: 10`). |
| `POST` | `/public/inquiries` | Public | `@Public()` | Validates slug | **Partially Implemented**| Creates `ContactInquiry`. Fails to check if target school is unpublished or soft-deleted. |
| `GET` | `/schools/my-schools` | Schools | `JwtAuthGuard` | User context | **Complete** | Returns all school memberships for authenticated user. |
| `POST` | `/schools/onboarding` | Schools | `JwtAuthGuard` | User context | **Complete** | Bootstraps new school, default profile, theme config, settings, and standard pages. |
| `POST` | `/schools` | Schools | `JwtAuthGuard` | User context | **Complete** | Creates school and assigns creator as `OWNER`. |
| `GET` | `/schools/:id` | Schools | `JwtAuthGuard` | `TenantGuard` | **Complete** | Retrieves school details, profile, theme, and counts. |
| `PATCH` | `/schools/:id` | Schools | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Updates school name, slug, domain, publish status. |
| `GET` | `/schools/:id/overview`| Schools | `JwtAuthGuard` | `TenantGuard` | **Partially Implemented**| Computes metrics, published counts, and recent activity. Hardcodes dummy fallback visitors. |
| `GET` | `/schools/:id/members` | Schools | `JwtAuthGuard` | `TenantGuard` | **Complete** | Returns school staff and membership roles. |
| `POST` | `/schools/:id/members` | Schools | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Adds existing platform user to school with specified role. |
| `DELETE`| `/schools/:id/members/:memberId` | Schools | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Removes staff member; prevents deleting sole owner. |
| `GET` | `/schools/:id/content` | Content | `JwtAuthGuard` | `TenantGuard` | **Broken** | Calculates completion percentages checking non-existent fields (`visionStatement`, `principalBio`). |
| `PATCH` | `/schools/:id/content` | Content | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Broken Contract** | Backend accepts `UpdateContentDto`. Frontend sends invalid `schoolCode` and `establishedYear`, causing 400 Bad Request. |
| `GET` | `/schools/:id/theme` | Theme | `JwtAuthGuard` | `TenantGuard` | **Complete** | Fetches active theme, template preset, colors, typography. |
| `PATCH` | `/schools/:id/theme/draft` | Theme | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Updates staged theme modifications in `draftConfig` JSON. |
| `POST` | `/schools/:id/theme/publish` | Theme | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Promotes draft theme settings to live site and clears draft. |
| `GET` | `/schools/:id/pages` | Pages | `JwtAuthGuard` | `TenantGuard` | **Complete** | Lists web pages with section count and publish status. |
| `POST` | `/schools/:id/pages` | Pages | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Creates new web page with unique slug validation per school. |
| `GET` | `/schools/:id/pages/:pageId` | Pages | `JwtAuthGuard` | `TenantGuard` | **Complete** | Fetches page and ordered sections. |
| `PATCH` | `/schools/:id/pages/:pageId` | Pages | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Updates page title, slug, summary, order, status. |
| `DELETE`| `/schools/:id/pages/:pageId` | Pages | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Prevents deleting home page; deletes custom page and cascades sections. |
| `POST` | `/schools/:id/pages/:pageId/sections` | Pages | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Creates page section (hero, stats, etc.) with content JSON. |
| `PATCH` | `/schools/:id/pages/:pageId/sections/:sectionId` | Pages | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Updates section content, title, visibility. |
| `PATCH` | `/schools/:id/pages/:pageId/sections/reorder` | Pages | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Transactional batch reordering of section order indices. |
| `DELETE`| `/schools/:id/pages/:pageId/sections/:sectionId` | Pages | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Deletes page section. |
| `GET` | `/schools/:id/teachers` | Teachers | `JwtAuthGuard` | `TenantGuard` | **Broken Type Handling** | Fails with PostgreSQL UUID syntax error if client passes school slug instead of UUID. |
| `GET` | `/schools/:id/teachers/:teacherId` | Teachers | `JwtAuthGuard` | `TenantGuard` | **Complete** | Retrieves teacher profile by ID within school context. |
| `POST` | `/schools/:id/teachers` | Teachers | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Creates teacher with designation, department, qualification, bio. |
| `PATCH` | `/schools/:id/teachers/:teacherId` | Teachers | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Updates teacher profile details. |
| `DELETE`| `/schools/:id/teachers/:teacherId` | Teachers | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Deletes teacher profile. |
| `GET` | `/schools/:id/notices` | Notices | `JwtAuthGuard` | `TenantGuard` | **Complete** | Lists notices with pagination, category filter, and pin ordering. |
| `GET` | `/schools/:id/notices/:noticeId` | Notices | `JwtAuthGuard` | `TenantGuard` | **Complete** | Retrieves single notice. |
| `POST` | `/schools/:id/notices` | Notices | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Creates notice with title, description, category, attachment URL. |
| `PATCH` | `/schools/:id/notices/:noticeId` | Notices | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Updates notice details and pin status. |
| `DELETE`| `/schools/:id/notices/:noticeId` | Notices | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Deletes notice. |
| `GET` | `/schools/:id/events` | Events | `JwtAuthGuard` | `TenantGuard` | **Complete** | Lists events with upcoming filter and date sorting. |
| `GET` | `/schools/:id/events/:eventId` | Events | `JwtAuthGuard` | `TenantGuard` | **Complete** | Retrieves single event. |
| `POST` | `/schools/:id/events` | Events | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Creates event with date, time, venue, description. |
| `PATCH` | `/schools/:id/events/:eventId` | Events | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Updates event details. |
| `DELETE`| `/schools/:id/events/:eventId` | Events | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Deletes event. |
| `GET` | `/schools/:id/gallery` | Gallery | `JwtAuthGuard` | `TenantGuard` | **Complete** | Computes storage quota, albums count, and media assets. |
| `GET` | `/schools/:id/gallery/albums` | Gallery | `JwtAuthGuard` | `TenantGuard` | **Complete** | Lists gallery albums with photo counts. |
| `POST` | `/schools/:id/gallery/albums` | Gallery | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Creates album with title, unique slug per school. |
| `GET` | `/schools/:id/gallery/albums/:albumId` | Gallery | `JwtAuthGuard` | `TenantGuard` | **Complete** | Fetches album with photos array. |
| `PATCH` | `/schools/:id/gallery/albums/:albumId` | Gallery | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Updates album title, slug, cover. |
| `DELETE`| `/schools/:id/gallery/albums/:albumId` | Gallery | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Deletes album and cascades photos. |
| `POST` | `/schools/:id/gallery/albums/:albumId/photos` | Gallery | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Adds photo to album and increments album photo counter. |
| `DELETE`| `/schools/:id/gallery/albums/:albumId/photos/:photoId` | Gallery | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Removes photo from album. |
| `GET` | `/schools/:id/gallery/media` | Gallery | `JwtAuthGuard` | `TenantGuard` | **Complete** | Lists uploaded `MediaAsset` entries with formatted file size. |
| `POST` | `/schools/:id/gallery/media` | Gallery | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Inserts `MediaAsset` record linking filename, URL, and school ID. |
| `DELETE`| `/schools/:id/gallery/media/:assetId` | Gallery | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Removes `MediaAsset` database record. Does not delete file from MinIO. |
| `GET` | `/schools/:id/navigation` | Navigation | `JwtAuthGuard` | `TenantGuard` | **Complete** | Retrieves header/footer navigation items. Auto-seeds defaults if empty. |
| `PUT` | `/schools/:id/navigation` | Navigation | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Atomically replaces menu items for header or footer. |
| `GET` | `/schools/:id/seo` | SEO | `JwtAuthGuard` | `TenantGuard` | **Complete** | Retrieves site title, meta description, keywords, OpenGraph URL. |
| `PATCH` | `/schools/:id/seo` | SEO | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Updates SEO configurations. |
| `GET` | `/schools/:id/domains` | Domains | `JwtAuthGuard` | `TenantGuard` | **Complete** | Returns school subdomain and registered custom domains. |
| `POST` | `/schools/:id/domains` | Domains | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Adds custom domain, generates DNS instructions (A, CNAME, TXT). |
| `POST` | `/schools/:id/domains/:domainId/verify` | Domains | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Mock Verification** | Automatically marks domain as `SSL_ACTIVE` and verified without real DNS check. |
| `POST` | `/schools/:id/domains/:domainId/set-primary` | Domains | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Sets custom domain as primary URL on school. |
| `DELETE`| `/schools/:id/domains/:domainId` | Domains | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Deletes custom domain record. |
| `GET` | `/schools/:id/integrations` | Integrations | `JwtAuthGuard` | `TenantGuard` | **Complete** | Lists connected ERP and Admission integrations. |
| `PATCH` | `/schools/:id/integrations` | Integrations | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Saves integration credentials and endpoint configuration. |
| `POST` | `/schools/:id/integrations/:type/sync` | Integrations | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Mock Implementation**| Appends dummy history log without executing real external sync. |
| `GET` | `/schools/:id/analytics` | Analytics | `JwtAuthGuard` | `TenantGuard` | **Partially Implemented**| Returns traffic records, breakdown, and top pages. Returns hardcoded numbers if DB empty. |
| `GET` | `/schools/:id/settings` | Settings | `JwtAuthGuard` | `TenantGuard` | **Complete** | Returns timezone, date format, admission toggle, maintenance mode. |
| `PATCH` | `/schools/:id/settings` | Settings | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Updates school operational settings. |
| `GET` | `/schools/:id/publishing/status` | Publishing | `JwtAuthGuard` | `TenantGuard` | **Complete** | Calculates staged draft changes (pages, theme, notices, events). |
| `POST` | `/schools/:id/publishing/release` | Publishing | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Partially Implemented**| Creates version snapshot; publishes draft pages and theme, but leaves draft notices/events unpublished. |
| `POST` | `/schools/:id/publishing/toggle-status` | Publishing | `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN)` | **Complete** | Toggles school `isPublished` boolean (maintenance mode). |
| `GET` | `/schools/:id/inquiries`| Public/Inquiries| `JwtAuthGuard` | `TenantGuard` | **Complete** | Retrieves contact inquiries for school. |
| `PATCH` | `/schools/:id/inquiries/:inquiryId` | Public/Inquiries| `JwtAuthGuard` | `TenantGuard`, `SchoolRoles(OWNER, ADMIN, EDITOR)` | **Complete** | Updates inquiry status (`READ`, `RESPONDED`) and appends response notes. |
| `GET` | `/posts` | Posts | `@Public()` | None | **Not Applicable** | Legacy starter template blog post listing. |
| `GET` | `/posts/:id` | Posts | `@Public()` | None | **Not Applicable** | Legacy template endpoint. |
| `GET` | `/posts/slug/:slug` | Posts | `@Public()` | None | **Not Applicable** | Legacy template endpoint. |
| `POST` | `/posts` | Posts | `JwtAuthGuard` | None | **Not Applicable** | Legacy template endpoint. |
| `PATCH` | `/posts/:id` | Posts | `JwtAuthGuard` | None | **Not Applicable** | Legacy template endpoint. |
| `DELETE`| `/posts/:id` | Posts | `JwtAuthGuard` | None | **Not Applicable** | Legacy template endpoint. |

---

## 3. Discovered API Defects & Logical Errors

### Issue API-01: Storage File Upload & PostgreSQL Disconnect
- **File:** `src/modules/storage/storage.controller.ts` line 52
- **Defect:** `POST /storage/upload` handles multipart file upload and saves the binary into MinIO, returning `{ key, publicUrl }`. It does NOT take `schoolId` and does NOT insert a record into `media_assets`.
- **Impact:** Files uploaded via the studio media uploader are orphaned in MinIO. When the user reloads the Media Library, it fetches `GET /schools/:id/gallery/media` from PostgreSQL and finds zero assets.
- **Remediation:** Either enhance `POST /storage/upload` with tenant context to auto-create `MediaAsset`, or require the client to pass the MinIO key to `POST /schools/:id/gallery/media`.

### Issue API-02: Unauthenticated Object Storage Presigned URLs
- **File:** `src/modules/storage/storage.controller.ts` lines 24-40
- **Defect:** `POST /storage/presign-upload` and `POST /storage/presign-download` have `@Public()` decorator and allow the caller to pass an arbitrary `bucket` string.
- **Impact:** Any anonymous external actor can request presigned upload URLs to flood the MinIO storage or generate download links to sensitive stored assets.
- **Remediation:** Remove `@Public()` decorator. Restrict storage operations to authenticated users with tenant verification.

### Issue API-03: Arbitrary Object Deletion in Storage
- **File:** `src/modules/storage/storage.controller.ts` line 74
- **Defect:** `POST /storage/delete` accepts `{ key, bucket }` from any authenticated user without validating that the key belongs to the user's school.
- **Impact:** An authenticated user from School A can delete uploaded images, documents, or logos belonging to School B by passing School B's storage keys.
- **Remediation:** Enforce `TenantGuard` and verify that the target key is associated with the requesting school in `media_assets`.

### Issue API-04: Slug vs. UUID SQL Syntax Error in Service Layer
- **File:** `src/modules/teachers/teachers.service.ts` line 16, `events.service.ts`, `notices.service.ts`
- **Defect:** Controllers receive `@Param("id") id: string` from the path `/schools/:id/...`. `TenantGuard` allows `:id` to be either a school UUID or a slug (`northfield-high`). However, service methods execute `where: { schoolId: id }` directly.
- **Impact:** In PostgreSQL, `school_id` is a UUID column. If a client sends a slug (which frontend `api-client.ts` does by default), Prisma executes SQL with a string literal in a UUID column, resulting in PostgreSQL error: `invalid input syntax for type uuid: "northfield-high"` (HTTP 500).
- **Remediation:** Inject `@CurrentSchool()` or resolve `req.school.id` in `TenantGuard`, passing the resolved UUID `school.id` to the service methods.

### Issue API-05: Contract Mismatch in Content Updating
- **File:** `src/modules/content/content.controller.ts` & `src/modules/content/dto/content.dto.ts`
- **Defect:** `UpdateContentDto` only permits defined fields (`established`, `motto`, `principalName`, `address`, `phone`, etc.). The frontend `ContentManager.tsx` sends `establishedYear` and `schoolCode`.
- **Impact:** Because NestJS runs `ValidationPipe({ forbidNonWhitelisted: true })`, any content save from the Studio frontend is rejected with a 400 Bad Request error.

---

## 4. Missing API Endpoints (Gap Analysis)

To support a complete, production-ready public school profile, the following endpoints are missing:

| Missing Endpoint | Method | Expected Consumer | Business Justification |
|---|---|---|---|
| `/public/schools/:slug/notices` | `GET` | Public Visitors / Parents | Paginated, filterable notices with category & search. Current `/public/site` is hard-limited to 10. |
| `/public/schools/:slug/notices/:id` | `GET` | Public Visitors | Individual notice view with attachment download links and social share metadata. |
| `/public/schools/:slug/events` | `GET` | Public Visitors / Students | Paginated upcoming/past events calendar. |
| `/public/schools/:slug/events/:id` | `GET` | Public Visitors | Event detail view with venue, schedule, and ICS calendar export. |
| `/public/schools/:slug/teachers` | `GET` | Public Visitors | Filterable faculty directory by department. |
| `/public/schools/:slug/teachers/:id` | `GET` | Public Visitors | Verified public profile of single faculty member. |
| `/public/schools/:slug/gallery/albums/:id`| `GET` | Public Visitors | High-resolution photo gallery album viewer. |
| `/public/schools/:slug/pages/:pageSlug` | `GET` | Public Visitors | Dynamic page renderer for CMS pages created in Studio. |
| `/public/admissions/apply` | `POST` | Prospective Students | Public admission application submission with applicant details, grade, and documents. |
| `/public/admissions/track` | `GET` | Applicants | Status check for submitted admission applications via reference tracking number. |
| `/schools/:id/admissions` | `GET` | School Studio Admins | Review received admission applications, approve/reject candidates. |
| `/schools/:id/academics/classes` | `GET/POST`| School Studio Admins | Manage school grades, classes, sections, and curricula. |
| `/schools/:id/academics/subjects` | `GET/POST`| School Studio Admins | Manage subject directory by grade. |
