# Public School Profile Platform - Page & Route Audit

**Audit Date:** November 2026  
**Auditors:** Principal Software Architect, Senior UX Engineer, QA Lead  
**Scope:** Next.js 16 App Router (`SchoolWebsiteStudioPlatform_Frontend_new`)

---

## 1. Actual Next.js Route Inventory

The Next.js App Router filesystem structure under `src/app/` contains the following physical route entries:

| Route Path | File Location | Route Type | Access Level | Rendering Mechanism | Status | Notes |
|---|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Root Page | Protected / Studio | Client Component (`'use client'`) | Broken / Conditional | Renders `StudioApp`. Checks token in `localStorage`; if absent, redirects view to `login`. |
| `/preview` | `src/app/preview/page.tsx` | Preview Page | Public / Sim | Client Component (`'use client'`) | Partially Functional | Renders `PublicSite` inside preview shell with `PublicPreviewBar`. |
| `/login` | `src/app/login/page.tsx` | Auth Page | Public | Client Component (`'use client'`) | Broken | Direct login route. Form catches API error and silently authenticates anyway. |
| `/onboarding` | `src/app/onboarding/page.tsx` | Wizard Page | Public / Mixed | Client Component (`'use client'`) | UI Only | Direct onboarding route. Step 5 does not call backend onboarding endpoint. |
| `/not-found` | `src/app/not-found.tsx` | System 404 | Public | Server Component | Complete | Standard Next.js 404 page with return home button. |

---

## 2. Simulated Internal Views vs. Real Next.js Routes

A critical architectural flaw was uncovered during this audit: **The application simulates multi-page navigation entirely inside client React state, rather than leveraging Next.js App Router dynamic routes.**

### A. Simulated Studio Views (`StudioApp.tsx`)
The studio admin interface manages 18 distinct views inside a single component switch statement via `view` state in `StudioContext.tsx`:
1. `overview` (`<Overview />`)
2. `templates` (`<Templates />`)
3. `builder` (`<Builder />`)
4. `theme` (`<ThemeCustomization />`)
5. `design-system` (`<DesignSystem />`)
6. `pages` (`<DataManager type="pages" />`)
7. `teachers` (`<DataManager type="teachers" />`)
8. `notices` (`<DataManager type="notices" />`)
9. `events` (`<DataManager type="events" />`)
10. `gallery` (`<Gallery />`)
11. `media` (`<MediaLibrary />`)
12. `navigation` (`<NavigationManager />`)
13. `content` (`<ContentManager />`)
14. `academics` (`<Academics />`)
15. `seo` (`<SEOManager />`)
16. `domains` (`<DomainManager />`)
17. `integrations` (`<Integrations />`)
18. `analytics` (`<Analytics />`)
19. `settings` (`<Settings />`)
20. `publishing` (`<Publishing />`)

**Impairment:** None of these views have dedicated URLs (e.g., `/studio/teachers`, `/studio/analytics`). If an administrator refreshes the browser, presses back, or bookmarks a screen, their location is reset to `overview`.

### B. Simulated Public Site Pages (`PublicSite.tsx` & `PublicInnerPage.tsx`)
The public school website is rendered as a sub-component with `const [page, setPage] = useState('Home')`:
1. `Home` (`<PublicHome />`)
2. `About School` (`<PublicInnerPage page="About School" />`)
3. `Principal’s Message` (`<PublicInnerPage page="Principal’s Message" />`)
4. `Admission Information` (`<PublicInnerPage page="Admission Information" />`)
5. `Teachers` (`<PublicInnerPage page="Teachers" />`)
6. `Teacher Profile` (`<PublicInnerPage page="Teacher Profile" />`)
7. `Notices` (`<PublicInnerPage page="Notices" />`)
8. `Notice Details` (`<PublicInnerPage page="Notice Details" />`)
9. `Events` (`<PublicInnerPage page="Events" />`)
10. `Event Details` (`<PublicInnerPage page="Event Details" />`)
11. `Photo Gallery` (`<PublicInnerPage page="Photo Gallery" />`)
12. `Contact Us` (`<PublicInnerPage page="Contact Us" />`)
13. `404 Page` (`<PublicInnerPage page="404 Page" />`)

---

## 3. Detailed Route & Page Analysis

### Page 1: Public Homepage (`PublicHome.tsx`)
- **Route / Trigger:** `/preview` with `page === 'Home'`
- **Content Source:** 100% hardcoded in code and `config/templates.ts`.
- **API Integration:** ZERO API calls. Does not invoke `api.publicSite.getSite()`.
- **Visual Elements:**
  - Hero Section: Hardcoded headline ("Where curiosity becomes character"), subtitle, CTA buttons.
  - Stats Strip: Hardcoded numbers (1,240 students, 42 years, 98% graduation, 16:1 ratio).
  - Introduction Section: Hardcoded history ("Since 1983").
  - Principal Section: Hardcoded quote, Dr. Farhana Noor, portrait initials "FN".
  - Programs Strip: 3 hardcoded cards ("Primary years", "Middle school", "Senior school").
  - Notices Highlight: 3 hardcoded dates and titles ("12 MAY Summer schedule...", etc.).
  - Events Highlight: 3 hardcoded dates and events ("18 MAY Science Fair...", etc.).
  - Facilities Strip: 4 hardcoded cards.
  - Gallery Strip: 2 hardcoded static Unsplash images.
  - Admission CTA: Static text with button triggering internal `setPage('Admission Information')`.
  - Contact Section: Static address ("27 Lakeview Avenue, Dhanmondi, Dhaka 1209").
- **Issues Identified:**
  - Does not reflect any content customized or published by school administrators.
  - Modifying school info, teachers, notices, or theme in Studio has zero effect on this page.
  - Missing proper image optimization (`<img>` tag used instead of Next.js `<Image>`).

### Page 2: About School (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'About School'`
- **Content Source:** Static dictionary lookup from `src/config/public-pages.ts`.
- **Issues Identified:** Does not display school history, mission, vision, or established year from `SchoolProfile` in database.

### Page 3: Principal’s Message (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'Principal’s Message'`
- **Content Source:** Static dictionary lookup from `src/config/public-pages.ts`.
- **Issues Identified:** Ignores `SchoolProfile.principalBio`, `principalPhotoUrl`, and `principalTitle`. Shows generic placeholder copy.

### Page 4: Admission Information (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'Admission Information'`
- **Content Source:** Hardcoded 4-step instructions ("01 Review eligibility", etc.).
- **Issues Identified:**
  - Has a "Continue to application" button (`<button type="button">`), but clicking it does NOTHING. No link, no action, no route.
  - No admission application form exists.
  - No class/grade selection or document upload.
  - No link to external admission portal or ERP admission gateway.

### Page 5: Teachers Listing (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'Teachers'`
- **Content Source:** Hardcoded array of 6 teacher names (`Mahmud Karim`, `Sara Jahan`, `Nabil Chowdhury`, `Nusrat Ahmed`, `Tanvir Islam`, `Lamia Haque`).
- **Issues Identified:**
  - Ignores `Teacher` table in database.
  - "View profile" button sets internal state to generic `'Teacher Profile'` without passing teacher ID.
  - No department filter, no search bar, no pagination.

### Page 6: Teacher Profile (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'Teacher Profile'`
- **Content Source:** Generic text from `publicPagesContent['Teacher Profile']`.
- **Issues Identified:** Renders identical generic text for all teachers. Cannot view actual qualifications, experience, photo, or bio of specific teachers.

### Page 7: Notices Listing (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'Notices'`
- **Content Source:** Hardcoded 4-item list ("Summer schedule", "Science Fair", "Parent-teacher meetings", "Annual sports day").
- **Issues Identified:**
  - Ignores published notices in PostgreSQL.
  - Clicking arrow button sets state to `'Notice Details'` without ID context.
  - No category filter, search, pagination, or date filtering.

### Page 8: Notice Details (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'Notice Details'`
- **Content Source:** Generic text from `config/public-pages.ts`.
- **Issues Identified:** All notices show identical text. Cannot view notice body, publication date, or download attached PDF files.

### Page 9: Events Listing (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'Events'`
- **Content Source:** Same hardcoded list as notices with category tagged "SCHOOL EVENT".
- **Issues Identified:** Ignores `SchoolEvent` records. No date sorting, calendar view, or venue information.

### Page 10: Event Details (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'Event Details'`
- **Content Source:** Generic dictionary fallback.
- **Issues Identified:** No actual event date, start/end time, venue, or registration links.

### Page 11: Photo Gallery (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'Photo Gallery'`
- **Content Source:** Hardcoded array of 5 Unsplash image URLs.
- **Issues Identified:**
  - Ignores `GalleryAlbum` and `GalleryPhoto` database tables.
  - No album selection, categories, or captions.
  - Clicking an image does not open lightbox or higher-resolution view.

### Page 12: Contact Us (`PublicInnerPage.tsx`)
- **Route / Trigger:** `page === 'Contact Us'`
- **Content Source:** Hardcoded address ("27 Lakeview Avenue...") and an interactive form.
- **Issues Identified:**
  - Form submission hardcodes `schoolSlug: 'northfield-high'` regardless of tenant.
  - Error handler catches any API failure and displays success anyway ("Thank you for getting in touch").
  - No spam protection (reCAPTCHA, Turnstile, honeypot, or rate limit feedback).
  - Phone, email, and Google Maps are static strings rather than active tel/mailto links.

---

## 4. Navigation & User Journey Audit

### A. Main Header Navigation
- **Location:** `src/components/public-site/PublicHeader.tsx`
- **Items:** Home, About School, Academics, Faculty, Admissions, Notices, Events, Gallery, Contact.
- **Mechanism:** Calls `setPage(item.label)`.
- **Finding:** Operates purely on client-side state. Does not render customized navigation menus configured in the Studio (`NavigationMenu` / `NavigationMenuItem`).

### B. Header CTAs
- **"Apply Now" Button:** Present in header. Calls `setPage('Admission Information')`. Leads to dead-end text page.
- **"Student Portal" Link:** Missing.
- **"Staff Portal / Studio Login":** Present in footer/sub-menu. Links to `/login`.

### C. Footer Links
- **Location:** `src/components/public-site/PublicFooter.tsx`
- **Items:** School summary, quick links, academic links, contact details, copyright notice.
- **Finding:** All links trigger `setPage(...)` or are inert (`#`). Social media icons (Facebook, Twitter, LinkedIn, Instagram) have no `href` attributes.

### D. Breadcrumbs
- **Location:** `src/components/public-site/PublicInnerPage.tsx`
- **Format:** `Home > [Page Name]`
- **Finding:** Breadcrumbs are purely decorative text; "Home" is not a clickable link back to homepage.

---

## 5. Missing Public Pages & Routes (Deficit Matrix)

The following essential public school profile routes are logically expected by parents, students, accreditors, and search engines, but are completely absent from the Next.js routing tree:

| Required Route | Business Purpose | Target Audience | Impact If Missing | Priority |
|---|---|---|---|---|
| `/[schoolSlug]` | Dynamic multi-tenant school public homepage | Public, Parents, Students | Platform cannot host multiple schools on distinct URLs. Production blocker. | **P0** |
| `/[schoolSlug]/about` | School history, mission, vision, accreditation, EIIN | Prospective Families | Core institutional identity cannot be communicated. | **P1** |
| `/[schoolSlug]/principal-message` | Official letter/vision from head of school | Parents & Community | Leadership transparency missing. | **P1** |
| `/[schoolSlug]/academics` | Academic programs, curriculum, calendar | Parents & Students | Academic offering cannot be evaluated. | **P1** |
| `/[schoolSlug]/teachers` | Searchable, filterable faculty directory | Parents & Students | Families cannot see teachers or departmental structure. | **P1** |
| `/[schoolSlug]/teachers/[id]` | Individual public teacher profile | Parents & Students | Cannot verify teacher qualifications or experience. | **P2** |
| `/[schoolSlug]/notices` | Paginated, searchable official announcements | Students & Families | Parents miss critical schedules, circulars, closures. | **P0** |
| `/[schoolSlug]/notices/[id]` | Single notice view with downloadable PDF attachments | Students & Families | Cannot share notice links or download circular PDFs. | **P0** |
| `/[schoolSlug]/events` | Calendar of school activities and exams | Community & Students | Low event participation, missed deadlines. | **P1** |
| `/[schoolSlug]/events/[id]` | Event detail with schedule, map, and registration | Community | Cannot view specific venue or add to Google/Apple calendar. | **P2** |
| `/[schoolSlug]/gallery` | Photo and video albums categorized by year/event | Prospective Families | Visual campus life cannot be explored dynamically. | **P2** |
| `/[schoolSlug]/gallery/[albumId]` | Single album lightbox and photo grid | Prospective Families | Cannot view individual event photos. | **P2** |
| `/[schoolSlug]/admissions` | Admission criteria, circulars, fees, deadlines | Applicants & Parents | Severe admission drop-off; applicants cannot find circulars. | **P0** |
| `/[schoolSlug]/admissions/apply` | Public student admission application form | Applicants | Direct loss of new student enrollments. Critical revenue blocker. | **P0** |
| `/[schoolSlug]/admissions/track` | Application reference number status checker | Applicants | Parents flood administrative phone lines with inquiries. | **P1** |
| `/[schoolSlug]/contact` | Verified contact info, interactive map, inquiry form | General Public | Inquiries misrouted to default dummy school. | **P0** |
| `/[schoolSlug]/[customSlug]` | Dynamic CMS pages created via Studio Page Manager | General Public | Pages created in studio cannot be viewed publicly. | **P0** |

---

## 6. Page Health & State Evaluation

| State Type | Current Implementation | Evaluation & Risks |
|---|---|---|
| **Loading States** | Absent on public pages; DataManager displays inline text "Connecting to PostgreSQL backend..." | High risk of layout shift; users see blank screens or abrupt content pop-in during slow network connections. |
| **Error Boundaries** | Absent in App Router. No `error.tsx` in `src/app/`. | Any unhandled exception during rendering crashes the entire application into Next.js default error overlay. |
| **Empty States** | Minimal table-empty state in DataManager; none in PublicHome, Gallery, or Notices. | When a school has 0 published notices, empty containers render with broken or missing elements. |
| **Not-Found Handling** | Generic `src/app/not-found.tsx` exists, but public sub-routes have no contextual 404. | Searching for an invalid school slug or expired notice shows generic site 404 rather than school-specific help. |
| **Responsive Layout** | Studio and public components have CSS media queries for `< 768px` and `< 1024px`. | Desktop layout renders reasonably well; mobile builder canvas and table action menus overflow on narrow viewports (< 375px). |
