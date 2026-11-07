# Public School Profile Platform - PostgreSQL & Database Architecture Audit

**Audit Date:** November 2026  
**Auditors:** Database Architect, Senior Backend Engineer, Security Auditor  
**Database Engine:** PostgreSQL 17  
**ORM:** Prisma Client 7.x (`SchoolWebsiteStudioPlatform_Backend/prisma/schema.prisma`)

---

## 1. Database Schema Inventory (26 Models)

| Table Name | Model Name | Primary Key | Foreign Key Relations | Tenant Scoped | Soft Delete | Indexes Count | Status & Integrity Notes |
|---|---|---|---|---|---|---|---|
| `users` | `User` | UUID (`id`) | 5 child relations | No (Platform) | Yes (`deletedAt`) | 4 | Complete user model with role/status enums and bcrypt hash. |
| `refresh_tokens` | `RefreshToken` | UUID (`id`) | `userId` -> `User` (`Cascade`) | No | No (Revocation)| 2 | Has `tokenHash` unique index and `expiresAt`. |
| `otp_tokens` | `OtpToken` | UUID (`id`) | `userId` -> `User` (`Cascade`) | No | No (`isUsed`) | 2 | Index on `[email, type]`. |
| `posts` | `Post` | UUID (`id`) | `authorId` -> `User` (`Cascade`)| No | No | 3 | Starter template blog post leftover. Unlinked to schools. |
| `audit_logs` | `AuditLog` | UUID (`id`) | `userId` -> `User` (`SetNull`) | No | No | 2 | Logs administrative operations. |
| `schools` | `School` | UUID (`id`) | 19 child relations | Root Tenant | Yes (`deletedAt`) | 3 | Tenant root table. Unique on `slug` and `customDomain`. |
| `school_members` | `SchoolMember` | UUID (`id`) | `schoolId`, `userId` | Yes | No | 3 | Unique constraint on `[schoolId, userId]`. Uses `SchoolRole` enum. |
| `school_profiles` | `SchoolProfile` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 1 (Unique) | One-to-one with `School`. Stores contact, principal, JSON blobs. |
| `school_theme_configs` | `SchoolThemeConfig`| UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 1 (Unique) | One-to-one with `School`. Stores colors, fonts, and `draftConfig` JSON. |
| `web_pages` | `WebPage` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 3 | Unique on `[schoolId, slug]`. Missing self-relation on `parentId`. |
| `page_sections` | `PageSection` | UUID (`id`) | `pageId` -> `WebPage` (`Cascade`) | Via Page | No | 2 | Stores modular section configurations and order. |
| `teachers` | `Teacher` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 2 | Indexed on `[schoolId]`, `[schoolId, department]`. Missing soft delete. |
| `notices` | `Notice` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 2 | Indexed on `[schoolId]`, `[schoolId, status]`. Missing publishDate index. |
| `school_events` | `SchoolEvent` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 2 | Indexed on `[schoolId]`, `[schoolId, eventDate]`. |
| `gallery_albums` | `GalleryAlbum` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 2 | Unique on `[schoolId, slug]`. Photos count maintained in integer. |
| `gallery_photos` | `GalleryPhoto` | UUID (`id`) | `albumId` -> `GalleryAlbum` (`Cascade`)| Via Album | No | 1 | Stores individual photo URLs and metadata. Missing compound order index. |
| `navigation_menus` | `NavigationMenu` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 2 | Unique on `[schoolId, location]`. |
| `navigation_menu_items`| `NavigationMenuItem` | UUID (`id`) | `menuId` -> `NavigationMenu` (`Cascade`)| Via Menu | No | 1 | Stores menu labels and URLs. Missing self-relation on `parentId`. |
| `media_assets` | `MediaAsset` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 2 | Stores MinIO asset URLs, mimeTypes, and file sizes. |
| `seo_configs` | `SeoConfig` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 1 (Unique) | Stores site title, meta description, keywords array. |
| `custom_domains` | `CustomDomain` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 2 | Unique on `domain`. Stores DNS records JSON. |
| `school_integrations` | `SchoolIntegration`| UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 2 | Stores ERP credentials JSON and sync history. |
| `website_versions` | `WebsiteVersion` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 1 | Full JSON snapshot of published site at point in time. |
| `contact_inquiries` | `ContactInquiry` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 2 | Stores public contact form submissions. |
| `analytics_daily` | `AnalyticsDaily` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 2 | Unique on `[schoolId, date]`. Aggregates daily traffic. |
| `school_settings` | `SchoolSettings` | UUID (`id`) | `schoolId` -> `School` (`Cascade`) | Yes | No | 1 (Unique) | Stores timezone, date format, admission flag, maintenance mode. |

---

## 2. Critical Database Architecture Findings

### A. Missing Admission Models
A public school profile platform fundamentally requires a structured admission workflow. The current database has:
- `allowPublicAdmission Boolean` in `SchoolSettings`
- `type String // ADMISSION_GATEWAY` in `SchoolIntegration`
- **MISSING:**
  - `AdmissionApplication`: No table to persist student name, date of birth, gender, nationality, guardian details, target grade, previous school, or application fee transaction.
  - `AdmissionCircular`: No table for admission intake windows, application start/end dates, eligibility criteria, or required document lists.
  - `ApplicationDocument`: No table linking uploaded birth certificates, transcripts, or parent IDs to applications.

### B. Missing Academic Hierarchy Models
School profiles must present classes, subjects, faculty allocation, exam routines, and academic calendars. Currently:
- The entire academic structure is compressed into a single unvalidated JSON blob: `SchoolProfile.academics Json?`.
- **MISSING:**
  - `AcademicClass` / `GradeLevel` (e.g., Grade 6, Class 10, O-Level).
  - `AcademicSection` (e.g., Section A, Section B).
  - `Department` (currently a free-form string in `Teacher.department`).
  - `Subject` (title, code, syllabus, assigned department).
  - `AcademicCalendarItem` (term start/end dates, holidays, exam periods).
  - `AcademicResult` / `BoardExamResult` (public achievement statistics, pass rates, GPA distributions).

### C. Soft-Delete Inconsistency & Orphaned Record Hazard
- `User` and `School` implement soft deletion with `deletedAt DateTime?`.
- All child tables (`Teacher`, `Notice`, `SchoolEvent`, `GalleryAlbum`, `WebPage`, `MediaAsset`) do NOT have `deletedAt`.
- They specify `onDelete: Cascade` at the database foreign key level.
- **The Problem:** In PostgreSQL, an `UPDATE schools SET deleted_at = NOW()` is an update, NOT a delete. It does NOT trigger `onDelete: Cascade`.
- As a consequence, queries that do not explicitly join `school` and verify `school.deletedAt IS NULL` will continue to read and expose records from soft-deleted schools. In fact, `public-site.service.ts` for inquiries does not check `deletedAt: null`.

### D. BigInt JSON Serialization Hazard
- `MediaAsset.sizeBytes` is typed as `BigInt`.
- `School.planStorageLimit` is typed as `BigInt`.
- **The Problem:** JavaScript's native `JSON.stringify()` cannot serialize BigInt numbers and throws:
  `TypeError: Do not know how to serialize a BigInt`.
- Multiple service methods had to write manual conversion hacks (e.g., `Number(a.sizeBytes)` or JSON replacers). If any query returns a raw `MediaAsset` or `School` directly to the client without manual casting, the entire API request crashes with a 500 error.
- **Remediation:** In PostgreSQL, file sizes up to 10 GB easily fit in `Float` or double precision, or Prisma should use standard integer/custom middleware serializer.

### E. Unconstrained Parent References (Loose Foreign Keys)
- `NavigationMenuItem.parentId` is defined as `String? @db.Uuid @map("parent_id")` with NO foreign key constraint referencing `navigation_menu_items(id)`.
- `WebPage.parentId` is defined as `String? @db.Uuid @map("parent_id")` with NO foreign key constraint referencing `web_pages(id)`.
- **The Problem:** A menu item or page can reference a non-existent parent ID. Deleting a parent item leaves dangling child items with invalid parent pointers, causing hierarchy reconstruction in the UI to crash.

### F. Missing Query Performance Indexes
1. `Notice`: Public listings sort by `[isPinned DESC, publishDate DESC]` where `status = 'PUBLISHED'`.
   - Existing index: `@@index([schoolId, status])`
   - **Missing Index:** `@@index([schoolId, status, isPinned, publishDate])` for high-throughput public notice feeds.
2. `GalleryPhoto`: Photo ordering queries execute `where: { albumId }, orderBy: { order: 'asc' }`.
   - **Missing Index:** `@@index([albumId, order])`.
3. `SchoolEvent`: Filters upcoming events with `where: { schoolId, status: 'PUBLISHED', eventDate: { gte: now } }`.
   - **Missing Index:** `@@index([schoolId, status, eventDate])`.

### G. Status Representation Inconsistencies
- `PublishStatus` is a clean enum (`DRAFT, PUBLISHED, ARCHIVED, EXPIRED`).
- `UserStatus` is an enum (`ACTIVE, INACTIVE, PENDING_VERIFICATION, SUSPENDED`).
- However, `Teacher.status`, `School.status`, `CustomDomain.status`, `SchoolIntegration.status`, and `ContactInquiry.status` are defined as plain `String` columns.
- This creates vulnerability to casing inconsistencies (e.g., `'active'` vs `'ACTIVE'`) and typos that bypass validation at the database layer.

---

## 3. Migration Version Control Status

- **Inspection:** Inspected `SchoolWebsiteStudioPlatform_Backend/prisma/`.
- **Result:** NO `migrations` directory exists in the repository.
- **Finding:** The database has only been updated via `prisma db push` or raw seed scripts.
- **Production Risk:** Without an immutable, version-controlled migration history (`prisma migrate dev` / `prisma migrate deploy`), team members and CI/CD deployment pipelines cannot guarantee deterministic schema reproduction across staging, QA, and production environments.

---

## 4. Recommended Schema Migration Plan (Post-Audit)

1. Create initial baseline migration: `prisma migrate dev --name init_baseline`.
2. Introduce `AdmissionApplication`, `AdmissionCircular`, `ApplicationDocument` models.
3. Introduce `AcademicClass`, `AcademicSubject`, `AcademicCalendarItem` models.
4. Replace loose parent UUID strings with proper self-referential relations on `WebPage` and `NavigationMenuItem`.
5. Add missing compound performance indexes for public query paths.
6. Standardize string status fields into explicit Prisma Enums.
