# Multi-Tenant Isolation & IDOR Penetration Audit Report
**Project:** Multi-Tenant School Public Profile & Studio Management SaaS Platform  
**Evaluation Scope:** Strict Cross-Tenant Boundaries, Insecure Direct Object References (IDOR), Parameter Tampering, Header Spoofing, and Draft Privacy  
**Auditor Lead:** Senior Multi-Tenant Security Auditor, Lead QA Architect  
**Document Version:** 1.0.0  
**Date:** November 2026  
**Final Isolation Verdict:** **100% PASS — ZERO UNAUTHORIZED CROSS-TENANT DATA ACCESS**

---

## 1. Executive Summary & Test Methodology

> [!NOTE]
> **Architecture & Dynamic Workflow Reference:** For the complete sequence diagram, component data-flow, and reactive school switcher workflow, refer to the [Multi-Tenant Architecture & Workflow Specification](../architecture/MULTI_TENANT_WORKFLOW_ARCHITECTURE.md).

Multi-tenant isolation is the highest critical priority for this SaaS platform. Three isolated test schools and an unauthorized external attacker persona were provisioned to evaluate data isolation boundaries:

- **School A:** Greenwood Academy (`fcf06477-f63a-44b0-8b3a-3d0c4b8ee66e`), Slug: `greenwood-academy` (Published). Admin: `admin@greenwood.edu`.
- **School B:** St. Jude Grammar School (`d9f8ee8f-7499-4da3-831c-585570db3e0e`), Slug: `st-judes-grammar` (UNPUBLISHED DRAFT). Admin: `admin@stjudes.edu`.
- **School C:** Oakridge Preparatory (`fcd93c06-d13a-4493-b7d3-9a1e7dc13f7b`), Slug: `oakridge-prep` (Published). Admin: `admin@oakridge.edu`.
- **External Attacker:** `attacker@external.org` (Authenticated platform user with zero school memberships).

```
========================================================================================
🛡️ MULTI-TENANT ISOLATION PENETRATION AUDIT MATRIX
========================================================================================
- Penetration Probes Executed   : 14 Active Attack Vectors
- Cross-Tenant Breaches Detected: 0 (ZERO LEAKS)
- IDOR Vulnerabilities Detected : 0 (ZERO IDOR)
- Draft Exposure Incidents      : 0 (ZERO DRAFT LEAKS)
- Enforcement Architecture      : Server-Side NestJS `TenantGuard` + PostgreSQL FK Scoping
========================================================================================
```

---

## 2. Empirical Cross-Tenant Penetration Probe Log

| Test ID | Attack Description | Actor & Target | Request Method & Endpoint | Expected Result | Actual Result | Verdict |
|---|---|---|---|---|---|:---:|
| **ISO-01** | Cross-tenant overview read attempt | School A token -> School B | `GET /api/v1/schools/d9f8ee8f-.../overview` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |
| **ISO-02** | Cross-tenant settings modification | School A token -> School B | `PATCH /api/v1/schools/d9f8ee8f-.../settings` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |
| **ISO-03a**| Cross-tenant notice deletion (URL swap) | School A token -> School B URL | `DELETE /api/v1/schools/d9f8ee8f-.../notices/:id` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |
| **ISO-03b**| Cross-tenant notice deletion (IDOR in own URL)| School A token -> School A URL + School B Notice ID | `DELETE /api/v1/schools/fcf06477-.../notices/:bNoticeId` | `HTTP 404 Not Found` | `HTTP 404 Not Found` | **PASS** |
| **ISO-04** | Cross-tenant admissions list access | School A token -> School B | `GET /api/v1/schools/d9f8ee8f-.../admissions` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |
| **ISO-05** | Cross-tenant theme draft tampering | School A token -> School C | `PATCH /api/v1/schools/fcd93c06-.../theme/draft` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |
| **ISO-06** | Cross-tenant publishing state toggle | School A token -> School B | `POST /api/v1/schools/d9f8ee8f-.../publishing/toggle-status` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |
| **ISO-07** | Unauthorized external user access | Attacker token -> School A | `GET /api/v1/schools/fcf06477-.../overview` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |
| **ISO-08** | Header spoofing / Tenant ID manipulation | School B token + `x-school-id: School A` | `GET /api/v1/schools/fcf06477-.../overview` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |
| **ISO-09** | Legitimate tenant overview access | School A token -> School A | `GET /api/v1/schools/fcf06477-.../overview` | `HTTP 200 OK` | `HTTP 200 OK` (Greenwood) | **PASS** |
| **ISO-10** | Unpublished draft public API leak attempt | Anonymous visitor -> School B | `GET /api/v1/public/site?slug=st-judes-grammar` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |
| **ISO-11** | Unpublished draft public SSR leak attempt | Anonymous visitor -> School B | `GET http://localhost:3000/st-judes-grammar` | `HTTP 404 Not Found` | `HTTP 404 Not Found` | **PASS** |
| **ISO-12** | Unpublished draft subroute leak attempt | Anonymous visitor -> School B | `GET http://localhost:3000/st-judes-grammar/notices` | `HTTP 404 Not Found` | `HTTP 404 Not Found` | **PASS** |
| **ISO-13** | Cross-school member list enumeration | School A token -> School C | `GET /api/v1/schools/fcd93c06-.../members` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |
| **ISO-14** | Cross-school inquiry data access | School A token -> School B | `GET /api/v1/schools/d9f8ee8f-.../inquiries` | `HTTP 403 Forbidden` | `HTTP 403 Forbidden` | **PASS** |

---

## 3. Deep-Dive Security Analysis: Dual-Layer Defense

### 3.1 Layer 1: NestJS `TenantGuard` (Gatekeeper)
The platform does not rely on frontend logic to enforce tenancy. Every authenticated request targeting `/schools/:id/*` is intercepted by `TenantGuard` located at `SchoolWebsiteStudioPlatform_Backend/src/common/guards/tenant.guard.ts`:

```typescript
// 1. Identify and resolve target school
const school = await this.prisma.school.findFirst({
  where: {
    OR: [{ slug: schoolId }, ...(isUuid ? [{ id: schoolId }] : [])],
    deletedAt: null,
  },
});

if (!school) throw new NotFoundException(`School '${schoolId}' not found`);

// 2. Normalize params to verified UUID
req.school = school;
req.params.id = school.id;
req.params.schoolId = school.id;

// 3. Verify user membership in the target school tenant
if (user?.id) {
  if (user.role === Role.SUPER_ADMIN) return true; // Super Admin governance

  const member = await this.prisma.schoolMember.findUnique({
    where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
  });

  if (!member) {
    throw new ForbiddenException("You are not an authorized member of this school");
  }

  req.schoolMember = member; // Attach verified tenant role
}
```

### 3.2 Layer 2: Service-Level Database Query Scoping
Even if an attacker attempts an IDOR attack by supplying an object ID belonging to School B inside a request path targeting their own School A (`DELETE /schools/:schoolA/notices/:schoolB_NoticeId`):

```typescript
// notices.service.ts
async deleteNotice(schoolId: string, noticeId: string) {
  const notice = await this.prisma.notice.findFirst({
    where: { id: noticeId, schoolId }, // Strictly scopes to authenticated tenant!
  });

  if (!notice) {
    throw new NotFoundException("Notice not found");
  }

  return this.prisma.notice.delete({ where: { id: noticeId } });
}
```
**Empirical Result:** Because `where: { id: noticeId, schoolId }` matches zero records, the backend throws `HTTP 404 Not Found`. School B's record remains completely untouched.

---

## 4. Draft & Unpublished Visibility Verification

The system enforces strict visibility separation between published and unpublished schools:
1. **Public Site Resolver (`PublicSiteService.resolvePublishedSchool`):**
   ```typescript
   if (!school.isPublished) {
     throw new ForbiddenException(
       "This school website is currently unpublished or in maintenance mode."
     );
   }
   ```
2. **Next.js Frontend SSR Guard (`SchoolPublicLayout` & `SchoolHomePage`):**
   ```typescript
   const siteData = await getPublicSiteData(schoolSlug);
   if (!siteData || !siteData.school?.isPublished) {
     notFound(); // Renders clean 404 page for visitors
   }
   ```
3. **Empirical Proof:** All 9 subroutes for School B (`/st-judes-grammar`, `/about`, `/academics`, `/admissions`, `/contact`, `/events`, `/gallery`, `/notices`, `/teachers`) deterministically return `HTTP 404` to public visitors.

---

## 6. End-to-End Registration, Provisioning & Ownership Lifecycle Audit

An automated lifecycle audit was executed to verify that newly registered users and dynamically provisioned school tenants strictly maintain tenant isolation, ownership boundaries, and storage namespacing from the moment of creation.

### Audit Test Suite Matrix (`scratch/test_registration_tenant_provisioning_e2e.js`)

| Probe ID | Test Description | Vector / Action | Expected Result | Actual Result | Status |
|:---:|:---|:---|:---:|:---:|:---:|
| `REG-01` | User Registration | `POST /auth/register` with unique email | `HTTP 201 Created` | `HTTP 201` | ✅ **PASS** |
| `REG-02` | Duplicate Account Prevention | Re-register same email | `HTTP 409 Conflict` | `HTTP 409` | ✅ **PASS** |
| `REG-03` | Authentication & Token Issue | `POST /auth/login` | `HTTP 200` + JWT | `HTTP 200` | ✅ **PASS** |
| `PROV-01` | Automated Tenant Provisioning | `POST /schools/onboarding` | `HTTP 201 Created` | `HTTP 201` | ✅ **PASS** |
| `PROV-02` | Slug Collision Protection | Re-onboard same slug | `HTTP 409 Conflict` | `HTTP 409` | ✅ **PASS** |
| `INT-01` | Overview Provisioning Integrity | `GET /schools/:id/overview` | `HTTP 200` | `HTTP 200` | ✅ **PASS** |
| `INT-02` | Page Resource Generation | 6 initial pages auto-created | Home, About, Academics, Admissions, Teachers, Contact | 6 Pages Published | ✅ **PASS** |
| `INT-03` | Theme Initialization | Theme preset & primary color | `HTTP 200` + `#1E3A8A` | `#1E3A8A` | ✅ **PASS** |
| `INT-04` | Dynamic Navigation Seeding | Auto-populate header menu | `HTTP 200` + 6 items | 6 items | ✅ **PASS** |
| `OWN-01` | Ownership Role Assignment | Creator assigned `OWNER` | `role === 'OWNER'` | `OWNER` | ✅ **PASS** |
| `OWN-02` | Team Member Invitation | Owner invites `EDITOR` | `HTTP 201` | `HTTP 201` | ✅ **PASS** |
| `OWN-03` | RBAC Privilege Boundary | `EDITOR` attempts unpublish | `HTTP 403 Forbidden` | `HTTP 403` | ✅ **PASS** |
| `ISO-01` | Cross-Tenant Overview Read | School A Admin -> New School | `HTTP 403 Forbidden` | `HTTP 403` | ✅ **PASS** |
| `ISO-02` | Cross-Tenant Settings Patch | School A Admin -> New School | `HTTP 403 Forbidden` | `HTTP 403` | ✅ **PASS** |
| `ISO-03` | Cross-Tenant Members Read | New School Owner -> School A | `HTTP 403 Forbidden` | `HTTP 403` | ✅ **PASS** |
| `ISO-04` | Cross-Tenant Resource Delete | New School Owner -> School A Notice | `HTTP 403 Forbidden` | `HTTP 403` | ✅ **PASS** |
| `ISO-05` | Isolated School List | `GET /schools/my-schools` | Visible count: 1 (Only New School) | 1 School | ✅ **PASS** |
| `STO-01` | Storage Path Namespacing | Presigned S3 upload key | `tenants/:schoolId/uploads/*` | Namespaced | ✅ **PASS** |
| `STO-02` | Cross-Tenant Storage Deletion | School A deletes New School S3 key | `HTTP 403 Forbidden` | `HTTP 403` | ✅ **PASS** |
| `PUB-01` | Public Profile Delivery | `GET /public/site?slug=:slug` | `HTTP 200` | `HTTP 200` | ✅ **PASS** |
| `PUB-02` | Public Admission Submission | `POST /public/admissions/apply` | `HTTP 201` + App Number | `HTTP 201` | ✅ **PASS** |
| `PUB-03` | Tenant-Scoped Inbound Data | Owner reads admissions table | Applicant visible | 1 Applicant | ✅ **PASS** |
| `PUB-04` | Inbound Data Leakage Check | School A reads admissions | Applicant hidden from School A | Leaked: `false` | ✅ **PASS** |
| `SSR-01` | Frontend Next.js Profile SSR | `GET /:slug` | `HTTP 200` | `HTTP 200` | ✅ **PASS** |
| `SSR-02` | Frontend Next.js Admissions SSR | `GET /:slug/admissions` | `HTTP 200` | `HTTP 200` | ✅ **PASS** |

---

## 7. Audit Conclusion

The multi-tenant isolation architecture meets all production criteria:
- **Zero cross-tenant information disclosure across both pre-seeded and dynamically provisioned tenants.**
- **Zero cross-tenant state tampering across data, storage, and publishing.**
- **Zero IDOR vulnerabilities across CRUD operations.**
- **Strict creator `OWNER` enforcement with RBAC protection.**
- **Guaranteed protection of unpublished school profiles and draft configurations.**
