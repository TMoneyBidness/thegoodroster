# Blocked Items Tracker

Items paused on legal review, competitive research, or external dependencies.

## Active Blockers

### 1. TCPA Consent Copy — Final Language
- **Status:** Blocked (pending competitive research)
- **What:** Exact TCPA disclosure language for form consent checkboxes
- **Why:** Competitive compliance research (LendingTree, Bankrate, NerdWallet patterns) is in progress — output feeds directly into consent copy
- **Current placeholder:** Draft TCPA language in `siteConfig.tcpaConsentText` and PreQualQuiz Step 4. Marked with `TODO: pending TCPA competitive research`
- **Files affected:** `src/config/site.ts`, `src/components/tools/PreQualQuiz.tsx`
- **Unblocked when:** Competitive research delivers finalized TCPA language

### 2. Partner Page Disclaimer — Final Language
- **Status:** Blocked (pending legal review)
- **What:** Verbatim disclaimer for the Community Partners / Local Professionals page
- **Current placeholder:** Draft disclaimer using `siteConfig.partnerDisclaimer` + `siteConfig.compensationDisclosure`. Marked with `TODO: pending legal review`
- **Files affected:** `src/pages/community-partners.astro`
- **Unblocked when:** Legal approves verbatim partner page disclaimer

### 3. Privacy Policy — Legal Review
- **Status:** Drafted, pending legal review
- **What:** Full privacy policy has been drafted (170 lines) covering data collection, sharing/sale to mortgage professionals, CCPA rights, and "Do Not Sell" opt-out
- **Current state:** Substantive draft at `src/pages/privacy.astro` with `TODO: requires legal review before launch` banner
- **Unblocked when:** Attorney reviews and approves the draft. **Must be signed off before site goes live.**

### 4. Terms of Use — Legal Review
- **Status:** Stub, pending legal drafting
- **What:** Full terms of use page content
- **Files affected:** `src/pages/terms.astro`
- **Unblocked when:** Legal drafts terms of use

### 5. Partner Roster — Real Data
- **Status:** Placeholder data
- **What:** Real professional names, NMLS numbers, contact info for 2-3 listed professionals
- **Current placeholder:** `src/data/partners.json` has 3 entries with `[PARTNER_X_NAME]` placeholder values
- **Files affected:** `src/data/partners.json`
- **Unblocked when:** PM identifies and vets initial professionals, provides real data

### 6. Webhook Automation Endpoint
- **Status:** Blocked (developer dependency)
- **What:** The URL where the lead-router Worker POSTs lead data
- **Current placeholder:** `[WEBHOOK_AUTOMATION_URL]` env var
- **Files affected:** Worker secrets, `.env.example`
- **Unblocked when:** Automation layer (N8N / Apps Script / Zapier) is set up

## Resolved Items

| Item | Resolution | Resolved Date | Resolved By |
|---|---|---|---|
| Community Partners page structure | Unblocked — consumer-choice routing model implemented with 3 placeholder partners | 2026-04-25 | Pivot directive |
| Consent checkbox structure | Unblocked — TCPA checkbox UI built into PreQualQuiz Step 4 (copy pending research) | 2026-04-25 | Pivot directive |
| Privacy Policy stub | Upgraded from stub to substantive 170-line draft (pending legal review) | 2026-04-25 | Pivot directive |
| "Non-commercial" framing | Removed from all site copy — About, Homepage, Footer, Disclaimers, schemas | 2026-04-25 | Pivot directive |
| CCPA "Do Not Sell" link | Added to footer nav, anchored to Privacy Policy section | 2026-04-25 | Pivot directive |
