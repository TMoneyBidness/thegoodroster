# Placeholders Tracker

Every `[BRACKETED_PLACEHOLDER]` from the Architecture brief is tracked here. Each entry notes what it's waiting on, who owns the answer, and which files reference it.

## Active Placeholders

| Placeholder | Description | Waiting On | Owner | Files Referencing |
|---|---|---|---|---|
| `[BIA_NAME]` | Name of the Business Improvement Association operating the site | BIA leadership decision | BIA stakeholder | `.env.example`, `src/config/site.ts`, all layout components |
| `[BIA_DISTRICT]` | The BIA's district or neighborhood | BIA leadership decision | BIA stakeholder | `.env.example`, `src/config/site.ts`, About page |
| `[SITE_DOMAIN]` | Production domain (recommend `.org`) | Domain purchase | BIA stakeholder | `.env.example`, `astro.config.mjs`, `public/robots.txt` |
| `[SITE_NAME]` | Display name for the site | BIA leadership decision | BIA stakeholder | `.env.example`, `src/config/site.ts` |
| `[EDITORIAL_AUTHOR_NAME]` | Named author for content pages | BIA decision — who maintains content | BIA stakeholder | `.env.example`, `src/config/site.ts`, `EditorialBadge.astro` |
| `[EDITORIAL_AUTHOR_CREDENTIAL]` | Author credential (e.g., "Licensed Mortgage Broker, NMLS #XXXXXX") | Identity of author | BIA stakeholder | `.env.example`, `src/config/site.ts`, `EditorialBadge.astro` |
| `[CONTACT_EMAIL]` | General BIA contact email | BIA decision | BIA stakeholder | `.env.example`, `src/config/site.ts`, Contact page, Footer |
| `[CONTACT_PHONE]` | General BIA contact phone | BIA decision | BIA stakeholder | `.env.example`, `src/config/site.ts`, Header, Footer |
| `[GA4_MEASUREMENT_ID]` | Google Analytics 4 measurement ID | GA4 property creation | Developer | `.env.example`, `src/config/site.ts`, `BaseLayout.astro` |
| `[TURNSTILE_SITE_KEY]` | Cloudflare Turnstile site key for anti-spam | Turnstile setup in CF dashboard | Developer | `.env.example`, `src/config/site.ts`, form components |
| `[TURNSTILE_SECRET_KEY]` | Cloudflare Turnstile secret key (server-side) | Turnstile setup in CF dashboard | Developer | `.env.example`, Worker config |
| `[WEBHOOK_AUTOMATION_URL]` | Endpoint where leads are POSTed | Automation layer setup (N8N / Apps Script / Zapier) | Developer | `.env.example`, Worker secrets |
| `[WEBHOOK_AUTOMATION_SECRET]` | Shared secret for webhook HMAC verification | Automation layer setup | Developer | `.env.example`, Worker secrets |
| `[CLOUDFLARE_ACCOUNT_ID]` | Cloudflare account ID | CF account setup | Developer | `.env.example`, `wrangler.toml` |
| `[D1_DATABASE_ID]` | Cloudflare D1 database ID | D1 database creation | Developer | `.env.example`, `wrangler.toml` |
| `[PARTNER_1_NAME]` | Name of first listed mortgage professional | PM identifies professionals | PM | `src/data/partners.json` |
| `[PARTNER_1_COMPANY]` | Company of first listed professional | PM identifies professionals | PM | `src/data/partners.json` |
| `[PARTNER_1_NMLS]` | NMLS number of first listed professional | PM identifies professionals | PM | `src/data/partners.json` |
| `[PARTNER_1_PHONE]` | Phone of first listed professional | PM identifies professionals | PM | `src/data/partners.json` |
| `[PARTNER_1_EMAIL]` | Email of first listed professional | PM identifies professionals | PM | `src/data/partners.json` |
| `[PARTNER_2_*]` | Second listed professional (same fields) | PM identifies professionals | PM | `src/data/partners.json` |
| `[PARTNER_3_*]` | Third listed professional (same fields) | PM identifies professionals | PM | `src/data/partners.json` |

## Resolved Placeholders

| Placeholder | Resolved Value | Resolved Date | Resolved By |
|---|---|---|---|
| *(none yet)* | | | |
