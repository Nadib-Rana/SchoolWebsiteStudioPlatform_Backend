# Application Module Inventory & Architecture Catalog
**Project:** Multi-Tenant School Public Profile & Studio Management SaaS Platform  
**System Scope:** SaaS Platform for School Website Publishing & Studio Customization (Strictly Non-ERP/LMS)  
**Lead Auditor:** Senior QA Architect, Full-Stack Engineer, Multi-Tenant Security Auditor, Database Architect  
**Document Version:** 1.0.0  
**Date:** November 2026  

---

## 1. Executive Overview

This inventory documents all implemented modules, frontend routes, backend controllers, REST API endpoints, database models, and end-to-end workflows discovered directly from actual source code.

```
========================================================================================
📊 SYSTEM INVENTORY METRICS
========================================================================================
- Backend Feature Modules       : 23 Modules
- Backend REST Controllers      : 23 Controllers
- Discovered API Endpoints      : 108 Endpoints
- Database Models (Prisma)      : 27 Models (PostgreSQL 17)
- Frontend App Routes           : 19 Distinct Pages/Routes (Next.js 16 SSR + CSR)
- Studio Management Views       : 16 Interactive Views
- Active External Integrations  : PostgreSQL 17, MinIO S3, Mailpit SMTP, Headless Chrome
========================================================================================
```

---

## 2. Frontend Page & Route Inventory

The frontend is implemented in Next.js 16 (React 19) located in `SchoolWebsiteStudioPlatform_Frontend_new/src/app`.

| Route Path | Type | Render Mode | Component / View | Purpose |
|---|---|---|---|---|
| `/` | Authenticated CSR | Client | `<StudioApp />` | Central School Profile Studio dashboard |
| `/login` | Public CSR | Client | `<Login />` | School administrator / user login screen |
| `/onboarding` | Authenticated CSR | Client | `<Onboarding />` | Multi-step wizard to create a new school tenant |
| `/preview` | Authenticated CSR | Client | `<Preview />` | Full-screen live studio preview modal |
| `/[schoolSlug]` | Public SSR | Dynamic Server | `<PublicHome />` | School public homepage (Header, Hero, Bio, Stats, Footer) |
| `/[schoolSlug]/about` | Public SSR | Dynamic Server | `<AboutPage />` | School history, mission, vision, principal message |
| `/[schoolSlug]/academics`| Public SSR | Dynamic Server | `<AcademicsPage />`| Academic programs, curriculum, levels, facilities |
| `/[schoolSlug]/admissions`| Public SSR| Dynamic Server | `<AdmissionsPage />`| Public admission requirements, application form, tracking |
| `/[schoolSlug]/contact` | Public SSR | Dynamic Server | `<ContactPage />` | Contact details, office hours, interactive inquiry form |
| `/[schoolSlug]/events` | Public SSR | Dynamic Server | `<EventsPage />` | Public events calendar and upcoming activities |
| `/[schoolSlug]/events/[eventId]`| Public SSR| Dynamic Server | `<EventDetailPage />`| Detailed view of an individual event |
| `/[schoolSlug]/gallery`| Public SSR | Dynamic Server | `<GalleryPage />` | Photo albums and campus showcase gallery |
| `/[schoolSlug]/gallery/[albumId]`| Public SSR| Dynamic Server| `<AlbumDetailPage />`| Album photos grid and lightbox view |
| `/[schoolSlug]/notices`| Public SSR | Dynamic Server | `<NoticesPage />` | Public notice board, announcements, PDF downloads |
| `/[schoolSlug]/notices/[noticeId]`| Public SSR| Dynamic Server| `<NoticeDetailPage />`| Detailed view of an individual notice |
| `/[schoolSlug]/teachers`| Public SSR | Dynamic Server | `<TeachersPage />` | Public faculty and staff directory |
| `/[schoolSlug]/teachers/[teacherId]`| Public SSR| Dynamic Server| `<TeacherDetailPage />`| Individual teacher biography and qualifications |

### 2.1 Studio Management Views (`<StudioShell />`)
The Studio (`/`) switches views dynamically based on `view` state in `StudioContext`:
- `overview`: School overview, quick metrics, readiness checklist, and direct public link.
- `templates`: Visual template selector (Classic Split, Modern Minimal, Academic Traditional, Vibrant Cards).
- `builder`: Live drag-and-drop page section builder and content layout editor.
- `theme`: Theme customization (colors, fonts, border radii, header/footer layouts, draft saving).
- `design-system`: School brand typography, color palette, and component style preview.
- `pages`: Dynamic page management and section customizer.
- `teachers`: Faculty & staff directory manager (CRUD).
- `notices`: Public notice board manager with priority and pinning.
- `events`: School event calendar manager.
- `gallery`: Campus photo albums and photo management.
- `media`: Centralized media library and image assets.
- `content`: School profile narrative, bio, motto, facilities, and statistics.
- `academics`: Curriculum, grade levels, and academic program configurations.
- `admissions`: Management and review of online student admission applications.
- `navigation`: Header and footer navigation menu builder.
- `seo`: Search engine metadata, OpenGraph tags, sitemap, and robots.txt.
- `domains`: Custom domain mapping, DNS verification, and SSL status.
- `integrations`: External web tools (Google Analytics, Meta Pixel, Webhooks).
- `analytics`: Daily visitor traffic, top pages, traffic sources, device breakdown.
- `settings`: School time zone, language, contact email, and public admission toggle.
- `publishing`: Staged change review, version history snapshots, release deploy, and publish toggle.

---

## 3. Backend Module & Controller Inventory

The backend is organized into 23 NestJS modules under `SchoolWebsiteStudioPlatform_Backend/src/modules/`:

| Module Name | Controller Path | Controller Class | Guards Applied | Description |
|---|---|---|---|---|
| **App Core** | `/` | `AppController` | None | API metadata, health, and server info |
| **Auth** | `/auth` | `AuthController` | `JwtAuthGuard` (class) | Authentication, JWT login, refresh tokens, OTP, passwords |
| **Users** | `/users` | `UsersController` | `JwtAuthGuard`, `RolesGuard` | Platform-level user management (SUPER_ADMIN restricted) |
| **Schools** | `/schools` | `SchoolsController` | `JwtAuthGuard`, `TenantGuard` | School tenant provisioning, overview, and members |
| **Public Site** | `/public`, `/schools/:id/inquiries` | `PublicSiteController` | `TenantGuard` (for inquiries) | Public website SSR data resolver and visitor inquiries |
| **Publishing** | `/schools/:id/publishing` | `PublishingController` | `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | Version snapshots, publishing pipeline, publish toggle |
| **Theme** | `/schools/:id/theme` | `ThemeController` | `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | Theme customizer, draft saving, live theme publish |
| **Content** | `/schools/:id/content` | `ContentController` | `JwtAuthGuard`, `TenantGuard` | School profile text, stats, facilities, bio |
| **Pages** | `/schools/:id/pages` | `PagesController` | `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | Web pages and page sections CRUD |
| **Teachers** | `/schools/:id/teachers` | `TeachersController` | `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | Faculty and staff directory CRUD |
| **Notices** | `/schools/:id/notices` | `NoticesController` | `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | Public notice board announcements CRUD |
| **Events** | `/schools/:id/events` | `EventsController` | `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | School event calendar and schedules CRUD |
| **Gallery** | `/schools/:id/gallery` | `GalleryController` | `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | Photo albums, photos, and media assets CRUD |
| **Navigation** | `/schools/:id/navigation` | `NavigationController` | `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | Header and footer navigation menus CRUD |
| **Admissions** | `/public/admissions`, `/schools/:id/admissions` | `AdmissionsController` | `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | Public admission application, tracking, and management |
| **Storage** | `/storage` | `StorageController` | `JwtAuthGuard` | MinIO presigned upload/download URLs and buffer upload |
| **SEO** | `/schools/:id/seo` | `SeoController` | `JwtAuthGuard`, `TenantGuard` | Meta tags, OpenGraph, sitemap configuration |
| **Domains** | `/schools/:id/domains` | `DomainsController` | `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | Custom domain mapping and verification |
| **Integrations**| `/schools/:id/integrations` | `IntegrationsController`| `JwtAuthGuard`, `TenantGuard`, `SchoolRolesGuard` | External integrations (Analytics, Pixels, Webhooks) |
| **Analytics** | `/schools/:id/analytics` | `AnalyticsController` | `JwtAuthGuard`, `TenantGuard` | Daily pageviews, visitors, devices, traffic sources |
| **Settings** | `/schools/:id/settings` | `SettingsController` | `JwtAuthGuard`, `TenantGuard` | School configuration, timezone, admission toggle |
| **Health** | `/health` | `HealthController` | None | System health probe (PostgreSQL, MinIO connectivity) |
| **Posts** | `/posts` | `PostsController` | `JwtAuthGuard`, `RolesGuard` | Reference blog / post CRUD module |

---

## 4. Complete Database Model Catalog (Prisma ORM)

All 27 models defined in `SchoolWebsiteStudioPlatform_Backend/prisma/schema.prisma` mapped to PostgreSQL 17:

| # | Model Name | Table Name | Key Relations | Primary Role in SaaS |
|:---:|---|---|---|---|
| 1 | `User` | `users` | 1:N RefreshTokens, SchoolMembers | Platform user accounts with RBAC roles |
| 2 | `RefreshToken` | `refresh_tokens` | N:1 User (Cascade) | JWT refresh tokens with rotation and revocation |
| 3 | `OtpToken` | `otp_tokens` | N:1 User (Cascade) | Email verification and password reset OTPs |
| 4 | `Post` | `posts` | N:1 User (Cascade) | Platform reference articles |
| 5 | `AuditLog` | `audit_logs` | N:1 User (SetNull) | Security audit trail of user actions |
| 6 | `School` | `schools` | 1:N Members, 1:1 Profile, 1:1 Theme | Core tenant entity with slug and publish flag |
| 7 | `SchoolMember` | `school_members` | N:1 School, N:1 User | Multi-tenant RBAC mapping (OWNER, EDITOR, etc.) |
| 8 | `SchoolProfile` | `school_profiles` | 1:1 School (Cascade) | Public school narrative, contact, stats, facilities |
| 9 | `SchoolThemeConfig`| `school_theme_configs` | 1:1 School (Cascade) | Active theme, colors, typography, draft config |
| 10 | `WebPage` | `web_pages` | N:1 School, 1:N PageSections | Dynamic website pages (About, Curriculum, etc.) |
| 11 | `PageSection` | `page_sections` | N:1 WebPage (Cascade) | Individual page sections with JSON content |
| 12 | `Teacher` | `teachers` | N:1 School (Cascade) | Public faculty directory profiles |
| 13 | `Notice` | `notices` | N:1 School (Cascade) | Public school announcements and PDF notices |
| 14 | `SchoolEvent` | `school_events` | N:1 School (Cascade) | School events and calendar activities |
| 15 | `GalleryAlbum` | `gallery_albums` | N:1 School, 1:N GalleryPhotos | Public campus photo albums |
| 16 | `GalleryPhoto` | `gallery_photos` | N:1 GalleryAlbum (Cascade) | Photos within an album |
| 17 | `NavigationMenu` | `navigation_menus`| N:1 School, 1:N NavigationMenuItems | Header and footer menus |
| 18 | `NavigationMenuItem`| `navigation_menu_items`| N:1 NavigationMenu (Cascade) | Menu links, labels, and ordering |
| 19 | `MediaAsset` | `media_assets` | N:1 School (Cascade) | Media library metadata and S3 storage keys |
| 20 | `SeoConfig` | `seo_configs` | 1:1 School (Cascade) | Meta title, description, OG tags, sitemap |
| 21 | `CustomDomain` | `custom_domains` | N:1 School (Cascade) | Custom domain names and DNS verification |
| 22 | `SchoolIntegration`| `school_integrations`| N:1 School (Cascade) | Analytics tracking IDs and third-party keys |
| 23 | `WebsiteVersion` | `website_versions`| N:1 School (Cascade) | Immutable JSON release snapshots of the website |
| 24 | `ContactInquiry` | `contact_inquiries` | N:1 School (Cascade) | Public contact form submissions |
| 25 | `AnalyticsDaily` | `analytics_daily` | N:1 School (Cascade) | Daily aggregated visitor metrics |
| 26 | `SchoolSettings` | `school_settings` | 1:1 School (Cascade) | Tenant settings, timezone, admission flag |
| 27 | `AdmissionApplication`| `admission_applications`| N:1 School (Cascade) | Public online student admission inquiries |

---

## 5. End-to-End Architectural Workflows

### 5.1 School Tenant Onboarding Workflow
1. Authenticated user calls `POST /api/v1/schools/onboarding`.
2. Backend creates `School` record, assigns user as `SchoolRole.OWNER` in `SchoolMember`.
3. Auto-creates baseline `SchoolProfile`, `SchoolThemeConfig`, `SeoConfig`, `SchoolSettings`, and default `NavigationMenu`.
4. Tenant slug is registered and reserved immediately.

### 5.2 Studio Theme Customization & Staged Release Workflow
1. School admin opens Studio (`/`) and adjusts theme colors, fonts, or template presets.
2. Changes are saved as a staged draft via `PATCH /api/v1/schools/:id/theme/draft` (`draftConfig` JSON field).
3. Live public profile continues displaying published configuration without disruption.
4. Admin previews draft in live preview mode (`/preview` or Studio embedded frame).
5. When ready, admin clicks **Publish Website**:
   - `POST /api/v1/schools/:id/publishing/release` generates immutable `WebsiteVersion` snapshot.
   - Merges `draftConfig` into live theme fields and clears draft.
   - Promotes draft pages, notices, and events to `PUBLISHED`.
   - Sets `isPublished = true`.

### 5.3 Public Online Admission Application & Verification Workflow
1. Public visitor visits `/[schoolSlug]/admissions`.
2. Visitor completes 3-step application form and submits via `POST /api/v1/public/admissions/apply`.
3. Backend generates unique sequential reference number (e.g., `ADM-2026-9632`).
4. Visitor tracks application status via `GET /api/v1/public/admissions/track?applicationNumber=...&guardianPhone=...`.
5. Anti-enumeration security strictly requires matching guardian phone; brute-force guesses return `HTTP 404`.
6. School admin views application in Studio (`/schools/:id/admissions`) and updates status (`UNDER_REVIEW`, `ACCEPTED`, `REJECTED`).

### 5.4 Public Contact & Inquiries Workflow
1. Public visitor submits message via `POST /api/v1/public/inquiries`.
2. Record is stored in `contact_inquiries` mapped to `schoolId`.
3. School admin reviews inquiries in Studio and records internal response notes.
