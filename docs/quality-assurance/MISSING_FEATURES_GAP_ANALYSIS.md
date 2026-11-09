# Missing Features & Gap Analysis Report
**Project:** Multi-Tenant School Public Profile & Studio Management SaaS Platform  
**Evaluation Scope:** Codebase Audit, UI-to-API Contract Alignment, Backend Coverage, and Implementation Gaps  
**Lead Auditor:** Senior Full-Stack Engineer, QA Architect  
**Document Version:** 1.0.0  
**Date:** November 2026  

---

## 1. Executive Summary

This report establishes a rigorous gap analysis categorizing missing, partially implemented, buggy, insecure, and unverified functionality discovered during the exhaustive audit of the codebase. In strict compliance with audit rules, no unrelated ERP or LMS features (such as attendance, marks, payroll, or tuition fees) are evaluated.

```
========================================================================================
📊 GAP ANALYSIS CATEGORY BREAKDOWN
========================================================================================
- Category A: Confirmed Missing Functionality     : 3 Items
- Category B: Partially Implemented Functionality  : 3 Items
- Category C: Existing Functionality with Defect  : 2 Items
- Category D: Security Vulnerabilities            : 2 Items
- Category E: Performance Bottlenecks             : 2 Items
- Category F: Optional Architecture Improvements  : 4 Items
- Category G: Unverified Items                    : 1 Item
========================================================================================
```

---

## 2. Category A: Confirmed Missing Functionality

*Features documented in specifications or architectural references that have zero backend or frontend implementation.*

1. **A-01: Automated Next.js Dynamic Sitemap Route (`/sitemap.xml`)**
   - **Description:** While `SeoConfig.sitemapEnabled` exists in the database and SEO settings can be configured in Studio, Next.js does not currently contain an `app/sitemap.ts` dynamic route handler to automatically generate an XML sitemap for search engines.
   - **Impact:** Search engine crawlers must discover public pages via inbound links rather than a centralized index.

2. **A-02: Automated Dynamic Robots.txt Route (`/robots.txt`)**
   - **Description:** Missing `app/robots.ts` in Next.js to dynamically serve `robots.txt` directing crawlers away from studio management paths (`/preview`, `/login`, `/onboarding`) while prioritizing public school slugs.

3. **A-03: School Storage Quota Enforcement Gate**
   - **Description:** The `School.planStorageLimit` column (defaulting to 10 GB) exists in the database, but `StorageController` and `StorageService` do not check the tenant's current total storage usage before issuing presigned upload URLs.
   - **Impact:** Tenants could exceed their plan's allocated storage limit without being restricted.

---

## 3. Category B: Partially Implemented Functionality

*Features with working implementations in one tier (frontend or backend) but incomplete contract synchronization or automation.*

1. **B-01: Custom Domain Automated ACME/SSL Certificate Provisioning**
   - **Current State:** The database stores `CustomDomain` records (with DNS TXT verification records), and the Studio provides a Domain Manager UI.
   - **Gap:** Automated Let's Encrypt TLS certificate issuing via an ACME client (or edge API such as Cloudflare/Caddy) is not yet automated in the backend code; domains must be provisioned via an external edge proxy in production.

2. **B-02: Non-CRUD Studio Screen Save Triggers**
   - **Current State:** In `ManagementScreen.tsx`, clicking the top-right action button on informational screens (e.g. `integrations`, `analytics`) triggers a generic toast: `Changes saved successfully`.
   - **Gap:** Certain sub-views represent read-only status dashboards rather than active form mutations. The button should be disabled or contextualized per screen.

3. **B-03: Production Transactional Email Delivery**
   - **Current State:** `MailModule` is integrated with Nodemailer and Handlebars templates, routing through Mailpit on port 1025.
   - **Gap:** Production SMTP relay settings (e.g., SendGrid, AWS SES) are not wired in `.env` by default; requires manual production credentials.

---

## 4. Category C: Existing Functionality with Defects (Bugs)

*Implemented functionality that functions but exhibits specific edge-case defects.*

1. **C-01: Login DTO Field Discrepancy (`identifier` vs `email`)**
   - **Description:** `LoginDto` requires `{ identifier: string, password: string }`. If a client submits `{ email: string }`, the backend's strict validation pipe (`forbidNonWhitelisted: true`) rejects the request with `HTTP 400 Bad Request` rather than accepting either or aliasing `email`.
   - **Status:** Documented in `BUG-01`.

2. **C-02: Public Notice Board Query Field Inconsistency**
   - **Description:** The `Notice` model does not contain a `slug` column (unlike `WebPage` or `SchoolEvent`). The public notice detail route relies on `noticeId` (UUID) rather than a human-readable slug.
   - **Status:** Documented in `BUG-02`.

---

## 5. Category D: Security Vulnerabilities

*Identified security exposures requiring architectural remediation.*

1. **D-01: Storage Object Deletion Lacks Tenant Scope Verification (Finding SEC-01)**
   - **Severity:** High (P1)
   - **Description:** `POST /api/v1/storage/delete` accepts an arbitrary object `key` without validating that the key belongs to the authenticated user's school tenant namespace.
   - **Status:** Documented in `BUG-03` and `SECURITY_AUDIT_REPORT.md`.

2. **D-02: Storage Multipart Upload Lacks MIME Type Whitelisting (Finding SEC-02)**
   - **Severity:** Medium (P2)
   - **Description:** `POST /api/v1/storage/upload` FileInterceptor accepts arbitrary file extensions and MIME types without enforcing an image/PDF whitelist.
   - **Status:** Documented in `BUG-04` and `SECURITY_AUDIT_REPORT.md`.

---

## 6. Category E: Performance Bottlenecks

1. **E-01: Unpartitioned Daily Analytics Growth**
   - **Description:** `AnalyticsDaily` stores daily metrics per school. At 2,000 schools, this will reach ~730,000 rows/year. Without table partitioning, analytical aggregations will degrade over time.

2. **E-02: Lack of Edge CDN / Redis Caching on Public HTML**
   - **Description:** Public school pages currently rely on Next.js 60-second ISR revalidation. Under extreme traffic spikes (e.g. 5,000+ simultaneous visitors), an external Redis cache or Cloudflare edge cache would alleviate database load.

---

## 7. Category F: Optional Architecture Improvements

1. **F-01: JSON-LD Educational Organization Schema:** Embed structured data markup for rich Google search cards.
2. **F-02: Webhook Outbound Dispatcher:** Trigger external webhooks when admission applications are received.
3. **F-03: Real-Time Studio Collaboration:** Use WebSockets to alert when multiple admins are editing the same school profile.
4. **F-04: Image Optimization Pipeline:** Automated WebP resizing and compression upon upload.

---

## 8. Category G: Unverified Items

1. **G-01: Production High-Volume SMTP Deliverability:** Mail deliverability through real public ESPs (SendGrid/SES) under spam filtering algorithms cannot be evaluated in local staging.
