# Public School Profile Platform - Automated & Manual Test Report

**Audit Date:** November 2026  
**Test Harness:** Jest, Next.js 16 Turbopack, ESLint 9, Prisma CLI, TypeScript Compiler (tsc)  
**Execution Environment:** Linux x86_64, Node.js v20+

---

## 1. Test Execution Summary Matrix

| Check Type | Component | Exact Command Executed | Result | Exit Code | Issues / Observations |
|---|---|---|---|---|---|
| **TypeScript Validation** | Backend | `npm run build` | **PASS** | 0 | NestJS compilation succeeded with zero type errors. |
| **Unit Test Suite** | Backend | `npm run test` | **PASS (Low Coverage)** | 0 | 3 test suites passed (4 tests total). Only starter template tests; zero domain tests. |
| **E2E Test Suite** | Backend | `npm run test:e2e` | **PASS (Minimal)** | 0 | 1 test suite passed (2 tests total). Checks only `/` and `/health`. |
| **Code Quality / Lint** | Backend | `npx eslint "{src,apps,libs,test}/**/*.ts"` | **FAIL** | 1 | **326 problems** (320 errors, 6 warnings). Unsafe returns, unused variables, prettier formatting failures. |
| **Prisma Validation** | Backend | `npx prisma validate` | **PASS** | 0 | Prisma 7 schema validated successfully. |
| **Prisma Migrations** | Backend | `ls -la prisma/migrations` | **FAIL (Missing)** | 2 | No migrations directory exists. Database not version controlled. |
| **TypeScript Validation** | Frontend | `npx tsc --noEmit` | **PASS** | 0 | Strict TypeScript compilation succeeded with zero type errors. |
| **Code Quality / Lint** | Frontend | `npm run lint` | **FAIL** | 1 | **36 problems** (28 errors, 8 warnings). React hook cascading render error, `no-explicit-any`, unused vars. |
| **Production Build** | Frontend | `npm run build` | **FAIL** | 1 | Turbopack build failed: Google Fonts (`DM Serif Display`, `Inter`) connection error. |

---

## 2. Detailed Test Logs & Defect Diagnostics

### Test 1: Frontend Production Build Failure
- **Command:** `npm run build`
- **Output Diagnostic:**
  ```text
  ▲ Next.js 16.3.1 (Turbopack)
  - Environments: .env
  ✓ Running next.config.ts took 87ms
  Creating an optimized production build ...
  Turbopack build encountered 2 warnings:
  [next]/internal/font/google/dm_serif_display_62bcd1c4.module.css
  Warning: Error while requesting resource https://fonts.googleapis.com/css2?family=DM+Serif+Display:wght@400&display=swap
  [next]/internal/font/google/inter_c15e96cb.module.css
  Warning: Error while requesting resource https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap

  > Build error occurred
  Error: Turbopack build failed with 2 errors:
  Failed to fetch DM Serif Display from Google Fonts.
  Failed to fetch Inter from Google Fonts.
  If you are offline or behind a proxy, self-host the font with next/font/local.
  ```
- **Root Cause:** `src/app/layout.tsx` imports Google Fonts via `next/font/google`. In containerized, air-gapped, or network-restricted production environments, Next.js build immediately crashes.
- **Remediation:** Self-host the web fonts locally using `next/font/local` or include system font fallbacks.

---

### Test 2: Frontend ESLint Rules Violation
- **Command:** `npm run lint`
- **Output Diagnostic:**
  ```text
  /src/components/studio/StudioApp.tsx
    26:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders  react-hooks/set-state-in-effect
    24 |       setView('login')
    25 |     }
  > 26 |     setAuthChecked(true)
       |     ^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect

  /src/components/public-site/PublicHome.tsx
     70:11  warning  Using <img> could result in slower LCP and higher bandwidth. Consider using <Image /> from next/image
    295:9   warning  Using <img> could result in slower LCP and higher bandwidth.
    296:9   warning  Using <img> could result in slower LCP and higher bandwidth.

  /src/components/studio/academics/Academics.tsx
    21:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    23:48  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  ```
- **Total Problems:** 36 (28 errors, 8 warnings).
- **Remediation:** Refactor `StudioApp.tsx` auth check to use standard server redirects or client initialization without synchronous effect state updates. Replace `any` casts with explicit TypeScript interfaces.

---

### Test 3: Backend ESLint Quality Failure
- **Command:** `npx eslint "{src,apps,libs,test}/**/*.ts"`
- **Total Problems:** 326 (320 errors, 6 warnings).
- **Key Defects:**
  - `src/modules/theme/theme.service.ts`: `NotFoundException` defined but never used.
  - Unsafe assignments and unsafe member access of `any` values across `current-user.decorator.ts`, `pagination-params.decorator.ts`, and `tenant.guard.ts`.
  - 173 formatting and indentation discrepancies with Prettier rules.
- **Remediation:** Execute `npm run format` and clean up unused imports and unsafe `any` returns in decorators and guards.

---

### Test 4: Unit & E2E Test Coverage Deficit
- **Unit Test Execution:**
  ```text
  PASS src/modules/users/users.service.spec.ts (5.709 s)
  PASS src/app.controller.spec.ts (5.761 s)
  PASS src/modules/auth/auth.service.spec.ts (6.014 s)
  Test Suites: 3 passed, 3 total
  Tests:       4 passed, 4 total
  ```
- **E2E Test Execution:**
  ```text
  PASS test/app.e2e-spec.ts
    Starter Template E2E (Route Wiring)
      ✓ GET / (Root Application Info) (26 ms)
      ✓ GET /health (Health Check Probe) (4 ms)
  ```
- **Finding:** There is **0% test coverage** for all school platform domain logic:
  - 0 tests for `SchoolsService` or `TenantGuard` multi-tenant boundaries.
  - 0 tests for `TeachersService`, `NoticesService`, `EventsService`.
  - 0 tests for `PublicSiteService` or public inquiry submissions.
  - 0 tests for `GalleryService` or storage deletion authorization.
- **Production Readiness Assessment:** The application lacks automated test safety nets. Any code refactoring or bug fix carries a high risk of undetected regression.
