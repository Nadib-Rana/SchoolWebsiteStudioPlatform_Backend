# Comprehensive Architecture, Security, Database & Feature Audit Report: School Public Profile Platform

**Executive Audit Date:** November 2026  
**Audit Conducted By:** Principal Software Architect, Senior Full-Stack Engineer, Security Auditor, Database Architect, Product Analyst  
**Codebase Repositories:**
- **Frontend:** Next.js 16.3.1 (App Router), React 19.2.0, Tailwind CSS v4, Lucide Icons, Radix UI Primitives (`SchoolWebsiteStudioPlatform_Frontend_new`)
- **Backend:** NestJS 11.0.1, Prisma ORM 7.x, PostgreSQL 17, MinIO S3 Storage, Handlebars Mailer (`SchoolWebsiteStudioPlatform_Backend`)

---

## 1. Executive Summary

A comprehensive, end-to-end technical, security, architectural, and business logic audit of the **School Public Profile / Public School Website Platform** was completed. 

### Core Audit Verdict: **NOT PRODUCTION READY**
While the backend demonstrates clean modular structure and comprehensive CRUD coverage for studio administration (99 endpoints across 22 feature modules), the platform has **critical production blockers** across routing, multi-tenant security, storage integrity, frontend-backend contract consistency, and public-facing features:

1. **Absence of Real Public Routes:** The Next.js frontend has no dynamic routes for public schools (`/[schoolSlug]`, `/[schoolSlug]/teachers`, `/[schoolSlug]/notices/[id]`, etc.). The entire public school profile exists strictly as an internal client-side state simulation (`useState('Home')`) rendered under `/preview`. Search engine bots cannot index any school website, parents cannot bookmark or share links, and browser back/forward buttons are broken.
2. **Critical Security Vulnerabilities:**
   - Overly permissive CORS configuration reflects any requesting origin with credentials enabled.
   - Object storage endpoints (`/storage/presign-upload`, `/storage/presign-download`) are completely unauthenticated (`@Public()`), allowing anonymous actors to generate upload tokens for arbitrary buckets.
   - Object storage deletion (`/storage/delete`) performs zero tenant ownership verification, allowing any authenticated user to delete assets belonging to other schools.
   - Role privilege escalation: School administrators are seeded with platform `Role.ADMIN`, granting them access to list, inspect, and modify users across all schools.
3. **Frontend & Backend Contract Disconnects:**
   - The public website in the frontend never calls `GET /public/site`; all displayed information (stats, history, principal, notices, events, teachers) is 100% hardcoded mock data.
   - Studio content saving in `ContentManager.tsx` sends invalid fields (`schoolCode`, `establishedYear`), causing NestJS's strict `ValidationPipe` to reject the request with a 400 Bad Request error.
   - Studio `EditorModal.tsx` contains uncontrolled inputs with no state bindings; clicking "Save" only triggers a toast without calling any backend API.
   - Media file upload directly sends files to MinIO, but never creates a `MediaAsset` record in PostgreSQL; uploaded files vanish from the library on page reload.
4. **Missing Core Business Domains:**
   - **Admissions:** Complete absence of an admission application model, application form, document upload, or tracking system.
   - **Academics:** No database tables or APIs for classes, grades, sections, subjects, or routines.
5. **Build & Quality Failures:**
   - Frontend Next.js production build crashes in offline/sandboxed environments due to un-hosted Google Fonts (`DM Serif Display` and `Inter`) loaded via `next/font/google`.
   - Frontend lint fails with 36 problems, including a React Hook cascading render error in `StudioApp.tsx`.
   - Backend lint fails with 326 problems.
   - Database lacks version-controlled Prisma migrations (`prisma/migrations` is missing).

---

## 2. Project Architecture & Structure Discovery

### Repository Layout
```text
SchoolWebsiteStudioPlatform/
├── SchoolWebsiteStudioPlatform_Backend/
│   ├── prisma/
│   │   ├── schema.prisma         # 26 Prisma models (PostgreSQL)
│   │   └── seed.ts               # Demo tenant seeding (Northfield High)
│   ├── src/
│   │   ├── common/               # Guards, interceptors, filters, decorators, context
│   │   ├── config/               # App, DB, JWT, Mail, Storage, Swagger configurations
│   │   ├── database/             # Prisma service & module
│   │   └── modules/              # 22 Domain modules
│   ├── test/                     # E2E test specs (2 basic tests)
│   ├── docker-compose.yml        # PostgreSQL, MinIO, Mailpit
│   └── package.json
└── SchoolWebsiteStudioPlatform_Frontend_new/
    ├── src/
    │   ├── app/                  # Next.js App Router (4 routes only!)
    │   ├── components/
    │   │   ├── studio/           # Studio Admin SPA (Overview, Builder, Theme, etc.)
    │   │   ├── public-site/      # Public Site simulation components
    │   │   └── ui/               # Radix UI / Shadcn primitives
    │   ├── config/               # Templates, theme presets, mock public content
    │   ├── context/              # StudioContext (React state engine)
    │   └── lib/api-client.ts     # Client API wrapper
    ├── next.config.ts
    └── package.json
```

### Module Responsibilities & Audit Findings
| Module | Backend Responsibilities | Frontend Responsibilities | Verified State |
|---|---|---|---|
| **Auth** | JWT Access + Refresh token rotation, OTP verification, bcrypt password hashing | Login screen with email/password inputs | Login catches failures and bypasses auth into Studio. |
| **Users** | User management, profile editing, platform administration | Profile settings in Studio | Confuses platform `Role.ADMIN` with school tenant admin. |
| **Schools** | Tenant creation, onboarding bootstrap, member management | Onboarding wizard, member list | Onboarding wizard fails to dispatch API call. |
| **Content** | 8-section school profile completion calculation | ContentManager with 8 sidebar tabs | Form only allows editing school info; tab switching does nothing. Sends invalid fields. |
| **Theme** | Theme styling, presets, colors, fonts, draft vs live staging | ThemeCustomization & Templates screens | UI controls operate on local state; "Save" and "Publish" only show toasts. |
| **Pages** | Custom CMS pages and modular section tree (`PageSection`) | DataManager table & Builder canvas | Builder canvas is cosmetic mockup. DataManager action menus do nothing. |
| **Teachers** | Teacher directory with department, qualification, bio | DataManager table & public faculty list | Public site displays hardcoded teacher array. Service crashes if slug is passed instead of UUID. |
| **Notices** | Announcements with category, pin status, attachments | DataManager table & public notices list | Public site displays hardcoded notices. Publishing engine fails to release draft notices. |
| **Events** | Events calendar with dates, venue, registration URL | DataManager table & public events list | Public site displays hardcoded events. Publishing engine fails to release draft events. |
| **Gallery** | Photo albums, cover images, photo arrays | Gallery & MediaLibrary screens | Uploading media never writes to PostgreSQL. Cannot open albums or upload photos. |
| **Navigation** | Header & Footer dynamic menu ordering | NavigationManager | Working end-to-end in Studio; public site ignores dynamic navigation. |
| **SEO** | Site title, meta description, keywords, OpenGraph URL | SEOManager screen | SEOManager is a static mockup with hardcoded inputs. |
| **Domains** | Custom domain registration & DNS instructions | DomainManager screen | DomainManager is static mockup with hardcoded domain list. |
| **Integrations**| ERP and Admission sync logs | Integrations screen | Sync action merely appends dummy log without executing real external sync. |
| **Analytics** | Daily pageview aggregation, traffic sources, top pages | Analytics screen & visitor counter | Studio analytics screen is hardcoded. Visitor tracking only increments pageviews. |
| **Settings** | Operational settings (timezone, language, admission flag) | Settings screen | Basic settings save works; sessions and backup controls are inert mockups. |
| **Publishing** | Snapshot versioning, version rollback, draft release | Publishing screen | Releasing version publishes pages and theme, but leaves draft notices and events unpublished. |
| **Public Delivery**| Aggregated public site payload by slug or domain | PublicSite, PublicHome, PublicInnerPage | Public site components NEVER call this endpoint; 100% hardcoded. |
| **Storage** | MinIO object upload, presigned URLs, object deletion | MediaLibrary file picker | Presigned URLs open to public; arbitrary deletion has zero tenant scoping. |
| **Posts** | Starter template blog CRUD | None | Unused boilerplate. |

---

## 3. Page & Route Audit

### Route Inventory
- `/` (`src/app/page.tsx`): Loads `StudioApp` wrapped in `StudioProvider`. If token is absent, sets internal state to `'login'`.
- `/preview` (`src/app/preview/page.tsx`): Loads `PublicSite` wrapped in `StudioProvider`. Operates via internal React state `setPage(...)`.
- `/login` (`src/app/login/page.tsx`): Auth login view.
- `/onboarding` (`src/app/onboarding/page.tsx`): 5-step onboarding wizard.
- `/not-found` (`src/app/not-found.tsx`): Generic 404 page.

### Architectural Routing Gap
The platform possesses **zero public school routes**. In a standard multi-tenant educational platform, visitors must be able to visit:
- `/[schoolSlug]` (e.g. `platform.com/northfield-high`)
- `/[schoolSlug]/about`
- `/[schoolSlug]/teachers`
- `/[schoolSlug]/teachers/[id]`
- `/[schoolSlug]/notices`
- `/[schoolSlug]/notices/[id]`
- `/[schoolSlug]/events`
- `/[schoolSlug]/events/[id]`
- `/[schoolSlug]/gallery`
- `/[schoolSlug]/gallery/[albumId]`
- `/[schoolSlug]/admissions`
- `/[schoolSlug]/admissions/apply`
- `/[schoolSlug]/contact`

Because these routes do not exist:
- Search engines (Google, Bing) cannot crawl individual school profiles.
- Social sharing previews (OpenGraph, Twitter Cards) do not work.
- Parents cannot share direct links to examination schedules or circulars.
- Refreshing the browser on any simulated inner page resets the view back to the homepage.

---

## 4. API & Backend Architecture Audit

### Endpoint Discovery Summary
- **Total APIs Discovered:** 99 endpoints across 22 controllers.
- **Public APIs:** 16 endpoints (`/`, `/health`, `/auth/*`, `/storage/presign-*`, `/public/site`, `/public/inquiries`, `/posts/*`).
- **Protected Studio APIs:** 83 endpoints.
- **Tenant Isolation:** Enforced via `TenantGuard` and `SchoolRolesGuard` across all `/schools/:id/*` endpoints.

### Key Backend Defects
1. **Service Parameter Type Error:**
   `TenantGuard` accepts either a school UUID or a school slug (`northfield-high`) in the URL path. However, domain services (`teachers.service.ts`, `events.service.ts`, `notices.service.ts`) execute `where: { schoolId: id }` directly. Because `school_id` is a UUID column in PostgreSQL, passing a slug causes PostgreSQL to abort with `invalid input syntax for type uuid: "northfield-high"` (500 Internal Server Error).
2. **Storage Disconnect:**
   `POST /storage/upload` streams the file to MinIO and returns `{ key, publicUrl }`. It has no tenant context and does not write a row to `media_assets`. Uploaded files are lost to the database.
3. **Storage Security Risks:**
   - `POST /storage/presign-upload` is `@Public()`, allowing anonymous actors to generate upload URLs.
   - `POST /storage/delete` accepts an arbitrary `key` and deletes it directly from MinIO with no tenant verification.
4. **Content DTO Mismatch:**
   `ContentManager.tsx` sends `establishedYear` and `schoolCode`. NestJS runs `ValidationPipe({ forbidNonWhitelisted: true })`, rejecting every save attempt with HTTP 400.
5. **Publishing Engine Incompleteness:**
   `PublishingService.releaseVersion()` calculates staged changes across pages, theme, notices, and events. However, when executing the release, it only updates pages and theme, leaving draft notices and events unpublished.

---

## 5. PostgreSQL Database Architecture Audit

### Model Inventory (26 Models)
- **User & Auth:** `User`, `RefreshToken`, `OtpToken`, `Post`, `AuditLog`.
- **Tenant Root:** `School`.
- **Tenant Membership:** `SchoolMember`.
- **Profile & Branding:** `SchoolProfile`, `SchoolThemeConfig`.
- **Content & CMS:** `WebPage`, `PageSection`, `NavigationMenu`, `NavigationMenuItem`, `WebsiteVersion`.
- **Faculty & Community:** `Teacher`, `Notice`, `SchoolEvent`, `ContactInquiry`.
- **Media & Assets:** `GalleryAlbum`, `GalleryPhoto`, `MediaAsset`.
- **Infrastructure:** `CustomDomain`, `SchoolIntegration`, `AnalyticsDaily`, `SchoolSettings`, `SeoConfig`.

### Database Architectural Defects
1. **Missing Admission Schema:** Zero tables exist for admission applications, application documents, admission circulars, or application tracking.
2. **Missing Academic Schema:** Zero tables exist for classes, grades, sections, subjects, or routines; compressed into an unvalidated JSON column in `SchoolProfile`.
3. **Missing Foreign Key Constraints on Loose Parent Pointers:**
   `WebPage.parentId` and `NavigationMenuItem.parentId` are unconstrained UUID strings with no self-referential relations, allowing orphaned child items.
4. **Soft-Delete Inconsistency:**
   Only `User` and `School` have `deletedAt`. All child tables use `onDelete: Cascade`. A soft-delete update on `School` leaves child records active in database queries that omit explicit `school.deletedAt IS NULL` filters.
5. **BigInt Serialization Hazard:**
   `MediaAsset.sizeBytes` and `School.planStorageLimit` are `BigInt`. Any query returning raw model objects crashes with `TypeError: Do not know how to serialize a BigInt` in `JSON.stringify`.
6. **Missing Migration History:**
   No `prisma/migrations` directory exists. The database is not version controlled.

---

## 6. Security & Multi-Tenant Audit

### Critical Vulnerabilities Summary
1. **SEC-01 (Critical - CORS):** `src/main.ts` reflects any `Origin` header with `credentials: true`, allowing malicious third-party websites to make authenticated requests on behalf of logged-in school administrators.
2. **SEC-02 (High - Presigned URLs):** `/storage/presign-upload` and `/storage/presign-download` are public and unauthenticated, allowing arbitrary file uploads to MinIO.
3. **SEC-03 (High - Storage IDOR):** `/storage/delete` deletes any storage key without verifying school ownership.
4. **SEC-04 (High - Privilege Escalation):** School administrators seeded with platform `Role.ADMIN` have platform-level access to `/users`.
5. **SEC-05 (Medium - Inquiry Injection):** `/public/inquiries` does not check if target school is deleted or unpublished.
6. **SEC-06 (Medium - Auth Bypass):** `Login.tsx` catches API failures and navigates into Studio anyway.

---

## 7. QA, Build & Linting Test Verification

1. **Backend Build (`npm run build`):** PASSED (0 errors).
2. **Backend Unit Tests (`npm run test`):** PASSED (4 tests, but 0 tests for school domain logic).
3. **Backend E2E Tests (`npm run test:e2e`):** PASSED (2 tests, checking only `/` and `/health`).
4. **Backend ESLint:** FAILED with **326 problems** (320 errors, 6 warnings).
5. **Prisma Validate:** PASSED.
6. **Frontend TypeScript (`tsc --noEmit`):** PASSED (0 errors).
7. **Frontend ESLint (`npm run lint`):** FAILED with **36 problems** (28 errors, 8 warnings), including React Hook rule violation in `StudioApp.tsx`.
8. **Frontend Production Build (`npm run build`):** FAILED with Turbopack error: Failed to fetch Google Fonts (`DM Serif Display`, `Inter`).

---

## 8. Missing Features & Gap Analysis

| Feature Area | Current State | Required State | Priority |
|---|---|---|---|
| **Public School Routing** | Simulated in `/preview` with `useState` | Real SSR Next.js dynamic routes (`/[schoolSlug]/...`) | **P0** |
| **Public Data Integration** | Hardcoded mock data | Dynamic data fetching from `GET /public/site` | **P0** |
| **Admission Workflow** | 4-step static text with inert button | Online application form, document upload, tracking | **P0** |
| **Storage & Media Linkage** | Direct MinIO upload; no PostgreSQL row | Multipart upload writing to `media_assets` with tenant ID | **P0** |
| **Content Form Contract** | Rejected with 400 Bad Request | Aligned DTO fields (`established` vs `establishedYear`) | **P0** |
| **UUID vs Slug Handling** | 500 error when slug passed to service | Service resolves UUID from `TenantGuard` | **P0** |
| **Studio Editor Modals** | Inert forms that pass no data to `save()` | Controlled form state calling corresponding creation APIs | **P1** |
| **Publishing Scope** | Leaves draft notices & events unpublished | Releases notices & events alongside pages | **P1** |
| **Academic Hierarchy** | Static summary cards; raw JSON blob | Database models & CRUD for classes, grades, subjects | **P1** |
| **SEO & OpenGraph** | Static mockup in Studio; no public SSR meta | Dynamic `generateMetadata()` per school | **P1** |
| **Database Migrations** | None (`prisma/migrations` missing) | Version-controlled baseline migration | **P1** |
| **Domain Management** | Static UI mockup | Connected to `api.domains` with real DNS verify | **P2** |

---

## 9. Production Readiness Verdict & Remediation Roadmap

The platform has a strong visual foundation and a comprehensive backend module structure, but it is **not ready for production**. Deploying in its current state would result in build failures, security breaches (CORS and storage deletion), broken forms, and an unusable public website that search engines cannot index.

### Recommended Remediation Roadmap
1. **Phase 1: Security & Build Blockers (Immediate)**
   - Fix CORS in `main.ts`.
   - Remove `@Public()` from storage presign endpoints and secure `/storage/delete`.
   - Self-host fonts in Next.js to fix production build.
   - Fix slug vs. UUID resolution in backend services.
2. **Phase 2: Public Route & Data Wiring**
   - Create `src/app/[schoolSlug]/page.tsx` and sub-routes (`/teachers`, `/notices`, `/events`, `/contact`).
   - Wire public components to consume `GET /public/site` dynamically.
   - Correct `ContentManager.tsx` and `EditorModal.tsx` form state and API calls.
3. **Phase 3: Core Domain Completion**
   - Implement `AdmissionApplication` and `AdmissionCircular` models and public application form.
   - Implement `AcademicClass` and `Subject` models.
   - Update `PublishingService` to publish draft notices and events.
4. **Phase 4: Database & Code Quality Hardening**
   - Create baseline Prisma migration.
   - Resolve ESLint errors in frontend and backend.
   - Expand unit and E2E test suites to cover multi-tenant boundary checks.
