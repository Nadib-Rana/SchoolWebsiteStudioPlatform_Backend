# Public School Profile Platform - Remediation Tracker & Action Plan

**Audit Date:** November 2026  
**Auditors:** Principal Software Architect, Full-Stack QA & Security Lead  
**Classification Priorities:**
- **P0 (Production Blocker):** Critical security risk, data loss hazard, build failure, or complete architectural block.
- **P1 (High):** Major functional defect, broken core flow, or missing required school feature.
- **P2 (Medium):** Usability issue, mock UI replacement, or operational improvement.
- **P3 (Low):** Code quality, linting cleanup, or architectural enhancement.

---

## 1. Remediation Master Tracker

| Issue ID | Priority | Category | Module / Subsystem | Exact File Location | Summary of Defect | Status |
|---|---|---|---|---|---|---|
| **ISSUE-01** | **P0** | Security | Network / CORS | `SchoolWebsiteStudioPlatform_Backend/src/main.ts:36` | Overly permissive CORS callback reflects any request origin with credentials enabled. | **Resolved & Verified** |
| **ISSUE-02** | **P0** | Security | Object Storage | `src/modules/storage/storage.controller.ts:24-40` | Presigned upload/download endpoints are `@Public()` and unauthenticated. | **Resolved & Verified** |
| **ISSUE-03** | **P0** | Security | Object Storage | `src/modules/storage/storage.controller.ts:74` | `/storage/delete` allows deleting arbitrary MinIO files without school ownership check. | **Resolved & Verified** |
| **ISSUE-04** | **P0** | Build Blocker | Frontend Build | `SchoolWebsiteStudioPlatform_Frontend_new/src/app/layout.tsx:5` | Google Fonts download failure crashes Next.js production build in sandboxed/offline environments. | **Resolved & Verified** |
| **ISSUE-05** | **P0** | Architecture | Frontend Routing | `SchoolWebsiteStudioPlatform_Frontend_new/src/app/` | Absence of real dynamic `/[schoolSlug]` routes; public site exists only as simulated client state on `/preview`. | **Resolved & Verified** |
| **ISSUE-06** | **P0** | Broken Logic | Database / Storage | `src/modules/storage/storage.controller.ts:52` & `MediaLibrary.tsx:55` | Uploading media saves binary to MinIO but never writes a `MediaAsset` row to PostgreSQL. Files vanish on refresh. | **Resolved & Verified** |
| **ISSUE-07** | **P0** | Broken Logic | School Content | `src/modules/content/content.controller.ts` & `ContentManager.tsx:68` | Content save sends non-existent `schoolCode` and `establishedYear`, causing NestJS ValidationPipe 400 rejection. | **Resolved & Verified** |
| **ISSUE-08** | **P0** | Broken Logic | Service / Database | `src/modules/teachers/teachers.service.ts:16`, `events.service.ts` | Service queries PostgreSQL UUID column with raw `:id` string; passing school slug crashes with SQL syntax error (500). | **Resolved & Verified** |
| **ISSUE-09** | **P1** | Security | Multi-Tenant RBAC | `SchoolWebsiteStudioPlatform_Backend/prisma/seed.ts:44` | School admin seeded with platform-level `Role.ADMIN`, granting cross-tenant access to `/users`. | **Resolved & Verified** |
| **ISSUE-10** | **P1** | Security | Auth Enforcement | `src/components/studio/auth/Login.tsx:22` | Login catch block navigates directly into Studio on failed authentication. | **Resolved & Verified** |
| **ISSUE-11** | **P1** | Missing Feature| Public Delivery | `src/components/public-site/PublicHome.tsx` | Homepage content is 100% hardcoded; never calls `api.publicSite.getSite()` or reflects database updates. | **Resolved & Verified** |
| **ISSUE-12** | **P1** | Missing Feature| Admission Journey | Entire Repository | No admission model, no admission application form, no tracking, and no document upload capabilities. | **Resolved & Verified** |
| **ISSUE-13** | **P1** | Missing Feature| Academic Info | Entire Repository | No classes, grades, sections, subjects, or routines tables/APIs. Studio Academics page is static mock cards. | **Resolved & Verified** |
| **ISSUE-14** | **P1** | Broken Logic | Data Persistence | `src/components/studio/data-manager/EditorModal.tsx:226` | Modal inputs are unmanaged; `save()` passes no data and only shows a toast. Cannot create pages, teachers, notices, events. | **Resolved & Verified** |
| **ISSUE-15** | **P1** | Incomplete | Visual Customizer | `src/components/studio/builder/Builder.tsx` & `ThemeCustomization.tsx` | Visual builder and theme customizer are cosmetic mockups; "Save draft" and "Publish" do not dispatch API calls. | **Resolved & Verified** |
| **ISSUE-16** | **P1** | Missing Feature| Public Sub-Pages | `src/components/public-site/PublicInnerPage.tsx` | Individual public pages for notices, events, and teachers are generic dummy text; cannot view single notice or event. | **Resolved & Verified** |
| **ISSUE-17** | **P1** | Broken Logic | Publishing Engine | `src/modules/publishing/publishing.service.ts:135` | `releaseVersion` publishes draft pages and theme, but leaves draft notices and events unpublished. | **Resolved & Verified** |
| **ISSUE-18** | **P1** | Database | Database Migrations| `SchoolWebsiteStudioPlatform_Backend/prisma/` | Zero Prisma migrations exist in repository. Database lacks version control. | **Resolved & Verified** |
| **ISSUE-19** | **P2** | Incomplete | Content Manager | `src/components/studio/content/ContentManager.tsx:135` | Clicking the 8 sidebar items does not switch form fields; locked permanently to school info. | **Resolved & Verified** |
| **ISSUE-20** | **P2** | Incomplete | Photo Gallery | `src/components/studio/gallery/Gallery.tsx` | Album options buttons do nothing; cannot click into albums or upload photos into them. | **Resolved & Verified** |
| **ISSUE-21** | **P2** | Incomplete | SEO & Domains | `src/components/studio/seo/SEOManager.tsx` & `DomainManager.tsx` | Both managers are static mockups with hardcoded inputs and do not call backend APIs. | **Resolved & Verified** |
| **ISSUE-22** | **P2** | Incomplete | Integrations | `src/modules/integrations/integrations.service.ts:85` | ERP and Admission sync merely append a fake log string without contacting any external gateway. | **Resolved & Verified** |
| **ISSUE-23** | **P2** | Broken Logic | Contact Inquiries | `src/components/public-site/PublicInnerPage.tsx:125` | Public contact submission hardcodes `schoolSlug: 'northfield-high'` regardless of current school context. | **Resolved & Verified** |
| **ISSUE-24** | **P2** | Database | Data Integrity | `prisma/schema.prisma:280, 440` | `WebPage.parentId` and `NavigationMenuItem.parentId` are loose strings without self-referential relations. | Verified |
| **ISSUE-25** | **P3** | Code Quality | Frontend Lint | `src/components/studio/StudioApp.tsx:26` | React Hook rules violation (`react-hooks/set-state-in-effect`), 20+ `no-explicit-any` casts. | **Resolved & Verified** |
| **ISSUE-26** | **P3** | Code Quality | Backend Lint | `SchoolWebsiteStudioPlatform_Backend/` | 326 ESLint problems (320 errors, 6 warnings), prettier formatting mismatch. | **Resolved & Verified** |
| **ISSUE-27** | **P3** | DevOps | Configuration | `SchoolWebsiteStudioPlatform_Backend/docker-compose.yml` | Container port (5432) and DB name (`nest_starter_db`) mismatch actual `.env` (5435, `school_studio_db`). | **Resolved & Verified** |

---

## 2. Detailed Remediation Action Items

### P0 Actions (Must Fix Before Any Production Deployment)
1. **Fix CORS Configuration (`src/main.ts`):**
   - Replace open origin callback with whitelist containing platform root domain and dynamic lookup of verified `custom_domains`.
2. **Secure Object Storage Endpoints (`src/modules/storage/`):**
   - Remove `@Public()` from presign endpoints; require `JwtAuthGuard` and school context.
   - Enforce tenant validation in `/storage/delete`: check that the key exists in `media_assets` with matching `schoolId`.
3. **Resolve Next.js Font Build Error (`src/app/layout.tsx`):**
   - Download font binaries (`Inter`, `DM Serif Display`) and load them locally via `next/font/local` to guarantee deterministic builds.
4. **Implement Real Public Dynamic Routes (`src/app/`):**
   - Create `src/app/[schoolSlug]/page.tsx` (SSR public homepage consuming `GET /public/site?slug=...`).
   - Create public sub-routes: `/[schoolSlug]/teachers`, `/[schoolSlug]/notices/[id]`, `/[schoolSlug]/events/[id]`, `/[schoolSlug]/contact`.
5. **Fix Storage Upload & Database Linkage:**
   - Modify `POST /storage/upload` to accept `schoolId` and automatically write a row to `media_assets`.
6. **Fix Content Form Contract Mismatch (`ContentManager.tsx`):**
   - Update `ContentManager.tsx` payload to send `established` instead of `establishedYear`, remove `schoolCode`, and pass `schoolName` to `PATCH /schools/:id`.
7. **Fix Slug vs. UUID Resolution in Services:**
   - Ensure `TenantGuard` binds resolved `req.school.id` (UUID), and update controllers/services to use the resolved UUID rather than raw route parameters.

### P1 Actions (High Priority Functional Corrections)
8. **Correct Seed Roles & Privilege Scoping:**
   - Change seed user `admin@northfield.edu` platform role to `Role.USER`, relying strictly on `SchoolMember.role = OWNER`.
   - Restrict `UsersController` endpoints to `Role.SUPER_ADMIN`.
9. **Eliminate Frontend Auth Bypass:**
   - Remove fallback navigation in `Login.tsx` catch block; present visible error message.
10. **Implement Public Admission Workflow:**
    - Create `AdmissionApplication` model with `AdmissionStatus` enum in `schema.prisma`.
    - Create `AdmissionsModule` with `POST /public/admissions/apply`, `GET /public/admissions/track`, and authenticated studio status review endpoints.
    - Create interactive public application form & real-time tracker in `PublicAdmissionForm.tsx` on `/[schoolSlug]/admissions`.
    - Create `AdmissionsManager.tsx` in Studio management interface for administrative review.
    - Status: **Resolved & Verified**.
11. **Connect Studio DataManager & EditorModal:**
    - Bind controlled form state in `EditorModal.tsx` for each entity type.
    - Wire `save()` to invoke corresponding `api.teachers.create`, `api.notices.create`, `api.events.create`, `api.pages.create`.
12. **Complete Publishing Engine Notice/Event Release:**
    - Update `releaseVersion` in `publishing.service.ts` to promote draft notices and draft events to `PUBLISHED` alongside pages.
13. **Establish Baseline Prisma Migrations:**
    - Run `prisma migrate dev --name init_baseline` to produce a version-controlled migration file in `prisma/migrations`.

### P2 Actions (Medium Priority UX & Operational Improvements)
14. **Enable Multi-Section Editing in ContentManager:**
    - Implement tabbed or step-by-step form views for About School, Principal Message, Facilities, and Achievements.
15. **Connect SEO & Domain Managers to APIs:**
    - Wire `SEOManager.tsx` and `DomainManager.tsx` to `api.seo` and `api.domains` endpoints.
16. **Add Lightbox & Photo Upload in Gallery:**
    - Allow clicking an album to view photos, upload new images via MinIO, and reorder photos.
17. **Dynamic Context in Public Contact Form:**
    - Pass active school slug to `submitInquiry` instead of hardcoded `'northfield-high'`.
18. **Add Self-Referential Relations in Prisma Schema:**
    - Add `@relation("PageHierarchy", fields: [parentId], references: [id])` on `WebPage` and `NavigationMenuItem`.

### P3 Actions (Code Quality & Maintenance)
19. **Resolve ESLint Violations:**
    - Fix `StudioApp.tsx` effect setState issue.
    - Run Prettier fix on backend codebase.
20. **Sync Docker Compose Configuration:**
    - Align database name, port (5435), and credentials in `docker-compose.yml` with `.env`.
