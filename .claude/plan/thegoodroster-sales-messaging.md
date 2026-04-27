# Implementation Plan: TheGoodRoster Sales Messaging Overhaul

## Overview

A Brunson/Hormozi-style sales messaging audit scored the site 24/70. This plan maps each audit finding to exact files, line numbers, and code changes needed. Work is organized in four phases (P0-P3) by revenue impact.

## Codebase Summary

- **Framework:** Astro 4 + React islands, Tailwind CSS, Cloudflare Pages
- **Pages:** 23 Astro pages across `/src/pages/`
- **React Components:** 6 interactive (MortgageCalculator, AffordabilityCalculator, ClosingCostEstimator, PreQualQuiz, PartnerConnectForm, NeighborhoodMap)
- **Data files:** 4 JSON (dpa-programs, loan-limits, neighborhoods, partners)
- **Backend:** Cloudflare Worker at `/workers/lead-router/src/index.ts` (D1 + KV + webhook)
- **Config:** Centralized in `/src/config/site.ts`

---

## Phase 0: Stop the Bleeding (Week 1)

> **Goal:** Remove every element that destroys trust or dead-ends a visitor.

### P0-1. DPA Finder Tool routes to "coming soon"

**Problem:** The DPA Finder is the primary CTA on the highest-intent pages (DPA hub, FTHB guide). Every click lands on a "coming soon" placeholder.

**Files affected:**
- `src/pages/tools/dpa-finder.astro` (lines 22-28) — "coming soon" box
- `src/pages/first-time-homebuyer-san-diego.astro` (line 123, 363) — CTAs pointing to `/tools/dpa-finder/`
- `src/pages/down-payment-assistance-san-diego.astro` (lines 98, 454) — CTAs pointing to `/tools/dpa-finder/`
- `src/pages/index.astro` (line 69) — pathway card says "Up to $150,000"

**Action (Option A — ship a minimal DPA Finder):**
1. In `src/pages/tools/dpa-finder.astro`, replace the "coming soon" block with a new `<DPAFinderQuiz client:load />` React component
2. Create `src/components/tools/DPAFinderQuiz.tsx` — a simplified version using existing `dpaMatcher.ts` logic with a 5-question form (income bracket, first-time buyer Y/N, military Y/N, ZIP code, credit score range) that filters `dpa-programs.json` and shows matched programs inline
3. Reuses the existing `matchDPAPrograms()` function from `src/lib/calculations/dpaMatcher.ts`

**Action (Option B — redirect until built):**
1. Replace "coming soon" with the full DPA comparison table from the DPA hub
2. Change the page title to "San Diego DPA Programs — See Which Ones Fit Your Situation"

**Recommendation:** Option A — the matching engine already exists.

**Dependencies:** None
**Risk:** Medium (new React component, but reuses existing matching logic)

---

### P0-2. Community Partners has placeholder data

**Problem:** Partners page renders `[PARTNER_1_NAME]`, `[PARTNER_1_NMLS]`, etc. NMLS links point to invalid numbers.

**Files affected:**
- `src/data/partners.json` — ALL 3 partner entries contain bracketed placeholders
- `src/pages/community-partners.astro` — renders this data directly (lines 34-104)
- `src/pages/privacy.astro` (lines 83-88) — dynamically lists partners with NMLS

**Action (if real partners available):**
1. Replace all `[PARTNER_*]` values in `src/data/partners.json` with actual data

**Action (if real partners NOT available):**
1. Set `"isActive": false` for all 3 partners
2. Add an empty-state block: "Our Community Partner roster is being finalized."
3. Remove partner listing from `src/pages/privacy.astro` (lines 83-88)

**Dependencies:** Business decision — requires actual partner data
**Risk:** HIGH — fake NMLS numbers are a compliance hazard

---

### P0-3. All remaining placeholder strings

**Problem:** Config values fall back to bracketed placeholders that render in UI.

**Files affected:**
- `src/config/site.ts` (lines 15-21):
  - `editorialAuthor.name` = `'[EDITORIAL_AUTHOR_NAME]'`
  - `editorialAuthor.credential` = `'[EDITORIAL_AUTHOR_CREDENTIAL]'`
  - `contactEmail` = `'[CONTACT_EMAIL]'`
  - `contactPhone` = `'[CONTACT_PHONE]'`

**Where placeholders surface:**
- `src/components/trust/EditorialBadge.astro` (line 28) — "Reviewed by [EDITORIAL_AUTHOR_NAME]"
- `src/pages/contact.astro` (line 25) — form action is `mailto:[CONTACT_EMAIL]` (BROKEN)
- Privacy, about, header — graceful fallbacks exist

**Action:**
1. Update fallbacks in `src/config/site.ts`:
   - `'[EDITORIAL_AUTHOR_NAME]'` -> `'TheGoodRoster Editorial Team'`
   - `'[CONTACT_EMAIL]'` -> `'contact@thegoodroster.com'`
2. Fix contact form at `src/pages/contact.astro` line 25

**Dependencies:** Requires editorial author identity and working contact email

---

### P0-4. Privacy policy contradicts marketing

**Problem:** Privacy policy says "We share and **may sell** your personal information" while marketing says "one inquiry, one pro."

**Files affected:**
- `src/pages/privacy.astro` line 70 — "may sell" language
- `src/pages/privacy.astro` line 75 — "one or more participating mortgage professionals"
- `src/pages/privacy.astro` line 92 — contradicts line 75

**Action:**
1. Rewrite line 70: "We share your personal information with the specific third-party licensed mortgage professional you select."
2. Rewrite line 75: replace "one or more" with "the one Community Partner you select"
3. Keep CCPA "sale" characterization in Section 5 for legal accuracy

**Dependencies:** None
**Risk:** HIGH — compliance-level contradiction

---

### P0-5. Terms page says "pending legal review"

**Problem:** Yellow banner at lines 17-23 says "Content Pending Legal Review."

**Files affected:**
- `src/pages/terms.astro` (lines 4, 17-23)
- `src/components/layout/Footer.astro` — links to /terms/
- `src/config/site.ts` line 88 — footer legal nav
- `src/components/partners/PartnerConnectForm.tsx` line 137 — links to /terms/
- `src/components/tools/PreQualQuiz.tsx` line 543 — links to /terms/

**Action (Option B — unlink until ready):**
1. Remove the "Content Pending Legal Review" banner
2. Remove Terms link from footer nav in `src/config/site.ts` line 88
3. Remove "Terms of Use" links from PartnerConnectForm.tsx and PreQualQuiz.tsx
4. Add `noindex` to the terms page

**Dependencies:** None
**Risk:** Low

---

### P0-6. Factual accuracy errors — conforming loan limit

**Problem:** Conforming loan limit shows $766,550 (2025 value) across the site, labeled as "2026."

**Files affected (15+ occurrences of $766,550):**
- `src/config/site.ts` line 100
- `src/data/loan-limits.json` lines 17-18, 33
- `src/pages/loan-programs/conventional-loans-san-diego.astro` lines 13, 54, 59, 128, 139, 195
- `src/pages/loan-programs/fha-loans-san-diego.astro` line 118
- `src/pages/loan-programs/va-loans-san-diego.astro` lines 70, 103, 201
- `src/pages/loan-programs/index.astro` lines 31, 64
- `src/pages/first-time-homebuyer-san-diego.astro` line 260

**Action:**
1. Verify actual 2026 FHFA conforming loan limit for San Diego County
2. Update `src/data/loan-limits.json` and `src/config/site.ts`
3. Find-and-replace $766,550 across all 6 page files

**Dependencies:** Verified 2026 FHFA data
**Risk:** HIGH — factual accuracy destroys editorial credibility

---

### P0-7. CCPA "Your Privacy Choices" links to privacy page, not opt-out form

**Files affected:**
- `src/config/site.ts` line 52: `ccpaOptOutUrl: '/privacy/#do-not-sell'`
- `src/pages/privacy.astro` lines 109-131

**Action:** Add inline opt-out form below "Do Not Sell" heading, or ensure contact email is real (current email-based approach is CCPA-compliant if functional).

**Dependencies:** P0-3 (contact email must be real)

---

### P0-BUG. PreQualQuiz field names don't match Worker schema

**Problem (found during review):** `PreQualQuiz.tsx` sends `journey_stage`, `first_time_buyer`, `credit_score_range` but the Worker expects `is_first_time_buyer`, `credit_range`, `timeline`. Submissions would fail validation.

**Files:**
- `src/components/tools/PreQualQuiz.tsx` (lines 117-132)
- `workers/lead-router/src/index.ts` (lines 31-49)

**Action:** Align field names between quiz payload and Worker Zod schema.

---

## Phase 1: Install the Big Domino (Week 2)

> **Goal:** Rewrite all above-fold messaging to be dollar-anchored. Collapse competing CTAs into one.

### P1-8. Homepage H1 rewrite

**File:** `src/pages/index.astro` lines 33-38, 40-41

**Current:** "First-time homebuyer in San Diego? Start before you talk to anyone."
**Proposed:** "San Diego Has Up to $150K in Down Payment Money — See If You Qualify"

**CTA:** "See what you can afford" -> "Show Me My Match Report" pointing to `/tools/dpa-finder/`

**Dependencies:** P0-1 (DPA Finder must work)

---

### P1-9. FTHB, DPA Hub, Community Partners, Loan Programs H1 rewrites

| Page | File | Current H1 | Proposed H1 |
|------|------|-----------|-------------|
| FTHB | `first-time-homebuyer-san-diego.astro` L98 | "Your Complete Guide" | "How to Stack Up to $150K in DPA" |
| DPA Hub | `down-payment-assistance-san-diego.astro` L90 | "DPA Programs in SD County" | "$10K-$150K in Free Money — Every Program" |
| Partners | `community-partners.astro` L18 | "Choose a mortgage professional..." | "One Pro. Picked by You. Zero Spam." |
| Loan Programs | `loan-programs/index.astro` L18 | "Loan Programs for SD Homebuyers" | "The 4 Loans SD First-Timers Use" |

**Dependencies:** None
**Risk:** Low — copy changes only

---

### P1-10. CTA rewrites site-wide (~15 files)

Replace all generic CTAs ("Take the 60-Second Homebuyer Quiz", "See what you can afford") with benefit-loaded, dollar-anchored versions.

**Key changes:**
- PrimaryCTA default text: "Take the 60-Second Quiz" -> "Find My DPA Match"
- PrimaryCTA default href: `/tools/mortgage-calculator/` -> `/tools/dpa-finder/`
- StickyMobileCTA: "Take the Quiz" -> "Find My DPA Match"
- Every page-specific CTA updated per Appendix B of audit

**Dependencies:** P0-1 (DPA Finder must work)

---

### P1-11. Collapse to single Big Domino

**Action:**
1. Homepage hero: keep ONE primary CTA button
2. Pathway card "I need help with down payment" -> route to `/tools/dpa-finder/`
3. All article bottom CTAs: DPA Finder quiz as primary, PartnerListCTA as secondary

**Dependencies:** P0-1, P1-10

---

### P1-12. Fix 7 broken DPA detail URLs

**Problem:** DPA hub links to 7 detail pages that don't exist (sdhc-low-income, sdhc-middle-income, etc.)

**Quick fix:** Remove `detailUrl` props from all 7 ProgramCard components in `down-payment-assistance-san-diego.astro` (lines 197-259). ProgramCard already hides the "Learn more" link when URL is undefined.

**Later:** Build the 7 pages for long-tail SEO value.

---

## Phase 2: Ship the Match Quiz + Match Report (Week 3)

### P2-13. Build DPA Match Quiz

**New files:**
- `src/components/tools/DPAMatchQuiz.tsx` — 12-step React component
- `src/lib/calculations/matchReport.ts` — extends dpaMatcher.ts

**Modified files:**
- `src/pages/tools/dpa-finder.astro` — mount the quiz
- `src/lib/calculations/dpaMatcher.ts` — add matching fields
- `src/data/dpa-programs.json` — add any missing data

**12 questions:** ZIP, household size, income, first-time Y/N, military Y/N, target price, savings, credit band, employment, ethnicity (optional), email, homebuyer education Y/N.

**Key design:** No phone number. Email at step 11 (after sunk cost). Results shown immediately.

**Dependencies:** P0-1
**Complexity:** ~500 lines new React code

---

### P2-14. Build Match Report PDF

**New files:**
- `src/lib/pdf/generateMatchReport.ts` — client-side PDF generation (jspdf or @react-pdf/renderer)

**Content:** Matched programs + dollar amounts + scenario math + matched partner + next steps.

**Dependencies:** P2-13

---

## Phase 3: Stack the Offer (Week 4)

### P3-15. SD Homebuyer Playbook PDF (8 pages)
Static PDF in `/public/downloads/`. Content from existing FTHB guide.

### P3-16. Bonus PDFs (Wildfire + Pre-Approval)
Static PDFs in `/public/downloads/`.

### P3-17. Wire PDFs into email delivery sequence
Requires email service integration (Resend/Loops). 4-email sequence over 7 days.

### P3-18. Update all CTAs to full offer-stack language
Copy updates across ~15 files once full stack is built.

---

## Dependency Graph

```
Week 1 (P0):
  P0-3 (placeholders) ─── no deps
  P0-2 (partners)     ─── no deps
  P0-5 (terms)        ─── no deps
  P0-4 (privacy)      ─── no deps
  P0-6 (loan limits)  ─── no deps
  P0-BUG (quiz schema)─── no deps
  P0-7 (CCPA)         ─── depends on P0-3
  P0-1 (DPA finder)   ─── no deps (most complex in P0)

Week 2 (P1):
  P1-12 (broken URLs)  ─── no deps
  P1-8 (homepage H1)   ─── depends on P0-1
  P1-9 (other H1s)     ─── no deps
  P1-10 (CTA rewrites) ─── depends on P0-1
  P1-11 (Big Domino)   ─── depends on P0-1, P1-10

Week 3 (P2):
  P2-13 (Match Quiz)   ─── depends on P0-1
  P2-14 (Match PDF)    ─── depends on P2-13

Week 4 (P3):
  P3-15 (Playbook PDF) ─── no deps
  P3-16 (Bonus PDFs)   ─── no deps
  P3-17 (Email wiring) ─── depends on P2-13, P3-15, P3-16
  P3-18 (Stack CTAs)   ─── depends on P3-17
```

---

## File Change Summary

| Phase | New Files | Modified Files | Lines Changed (est.) |
|-------|-----------|---------------|---------------------|
| P0 | 0-1 | 10-12 | ~150 |
| P1 | 0-7 | 15-20 | ~200 |
| P2 | 2-3 | 3-5 | ~600 |
| P3 | 3-4 | 15 | ~100 (code) + design |
| **Total** | **5-15** | **~45** | **~1050** |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| No real partner data for P0-2 | HIGH | Set partners to inactive, show empty state |
| Conforming loan limit value disputed | HIGH | Verify with FHFA before changing |
| DPA Match Quiz complexity (P2-13) | MEDIUM | Reuse dpaMatcher.ts, build 5-question MVP first |
| Privacy rewrite needs legal review | HIGH | Draft changes, flag for review before deploy |
| PDF generation browser issues | MEDIUM | Test cross-browser; HTML fallback |
| Email sequence needs new service | MEDIUM | Start manual, automate later |

---

## Success Criteria

- [ ] No bracketed placeholder text visible on any page
- [ ] DPA Finder tool is functional (not "coming soon")
- [ ] All CTAs link to live, functional pages
- [ ] Conforming loan limit is correct and consistent across all pages
- [ ] Privacy policy matches actual data handling
- [ ] Terms page either has content or is unlinked
- [ ] 7 DPA detail URLs either resolve or are removed
- [ ] Homepage H1 is dollar-anchored and benefit-loaded
- [ ] Single clear primary CTA (DPA Match Quiz) site-wide
- [ ] All CTA text is specific and outcome-focused
