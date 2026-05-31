# Launch Expansion Draft — Social + Marketplace Dashboard (Subscription SaaS for UMKM)

## 1) Objective
Evolve AI Growth Copilot from “campaign generator” into a launch-ready operating system for UMKM: plan → create → schedule → measure → iterate, in one dashboard.

This draft adds the minimum professional features required to position the product as a subscription SaaS for Indonesia’s UMKM, focusing on:
- Multi-channel social management (Instagram, TikTok, Facebook, WhatsApp)
- Engagement analytics in one view
- Marketplace as a data source (manual import first) to support stock-aware offers and messaging

## 2) v1 Scope (Chosen)
### 2.1 Social: All channels, scheduling drafts (no auto-posting yet)
- Connect accounts for: Instagram, TikTok, Facebook, WhatsApp Business
- Generate content packs from Campaign output
- Create and schedule drafts on a unified calendar (reminder + checklist for manual publish)
- Pull engagement metrics where available via official APIs and show consolidated analytics

Why scheduling-only in v1:
- Avoid platform review / publishing permissions complexity
- Still looks professional and is highly valuable for a subscription product
- Reduces compliance risk and accelerates time-to-market

### 2.2 Marketplace: Manual import first
- CSV import: products, stock, orders (where applicable)
- Map marketplace SKU ↔ Product master in the system
- Use stock and best-seller signals to drive offer suggestions and “urgency/availability” CTAs

## 3) Product Modules (New)
### 3.1 Integrations
Purpose: connect accounts and keep connection status healthy.
- Connect/disconnect accounts per provider
- Show permissions/scopes and data freshness
- Health check and reconnect flow

### 3.2 Content Calendar
Purpose: turn campaign output into an execution plan.
- Calendar view (week/month)
- Draft scheduling per channel
- “Posting checklist” per draft (asset ready, caption ready, link ready)
- Reminder notifications (in-app)

### 3.3 Analytics Dashboard
Purpose: show campaign performance and justify subscription value.
- Overview metrics by date range: views/reach, engagement, follower delta, link clicks (if available)
- Breakdown by: channel, campaign, content type, offer variant
- Simple benchmarks and “what to try next” suggestions

### 3.4 Marketplace Import & Mapping
Purpose: unify operational data into marketing decisions.
- CSV importer + field mapping
- SKU mapping to internal products
- Stock-aware suggestion: “push this product”, “pause ads”, “use waiting list CTA”

## 4) Feature Requirements (FR)
### FR-08 Social Connections
- User can add multiple social accounts per provider
- Store token metadata securely and show status
- Support re-auth when token expires
Acceptance:
- User can view connection status; broken connections are detectable and recoverable

### FR-09 Content Calendar & Draft Scheduling
- Convert campaign output into draft items
- Draft contains: channel, caption, hashtags, CTA, suggested media (image/video URL), planned date/time, notes
- Calendar shows scheduled drafts and their status
Acceptance:
- User can schedule drafts for multiple channels from a single campaign

### FR-10 Engagement Sync & Analytics
- Periodic sync pulls metrics for published posts (manual publish assumed)
- Allow user to manually enter a post URL/ID if API cannot discover it
- Dashboard rolls up metrics to campaign level
Acceptance:
- User can see aggregated performance by channel and campaign

### FR-11 Marketplace Manual Import
- CSV upload to import:
  - products (SKU, name, category, price)
  - stock by location (optional)
  - orders summary (optional)
- Mapping UI: marketplace SKU ↔ internal product
Acceptance:
- Imported items appear in Product/Inventory and can be used to start campaigns

### FR-12 Offer Builder (Professional Launch Offer)
Add an “Offer” output that is conversion-focused for subscriptions and for UMKM campaigns.
Inputs:
- launch goal, constraints, price/margin (optional), channel mix
Outputs:
- 5–10 offer variants with mechanics, headline, CTA, risk flags, recommended channels
Acceptance:
- Offer section is copy-ready and can be turned into drafts in the calendar

## 5) UX Pages (Additions)
### 5.1 Integrations Page
- List providers: IG, TikTok, FB, WhatsApp
- Each provider shows:
  - connected accounts
  - status (ok/expired/error)
  - last sync time
  - connect/disconnect button

### 5.2 Calendar Page
- Month/week view
- Filters: channel, campaign, status
- Create draft from:
  - a campaign package (recommended)
  - scratch (manual)

Draft detail drawer:
- caption + hashtags + CTA + media attachment URL
- planned publish time
- checklist + notes

### 5.3 Analytics Page
- Date range picker
- KPI cards + charts
- Table by campaign/channel
- “Next action suggestions” (simple rules)

### 5.4 Marketplace Import Page
- Upload CSV
- Preview + mapping
- Import result summary

## 6) Data Model (Proposed Additions)
New tables (conceptual):
- `integrations`
  - `id, user_id, provider, account_external_id, account_name, status, scopes, token_ref, created_at, updated_at`
- `content_drafts`
  - `id, user_id, campaign_id, channel, content_type, caption, hashtags[], cta_text, media_urls[], notes, status(draft|scheduled|published|archived), created_at, updated_at`
- `content_schedule`
  - `id, draft_id, scheduled_at, timezone, reminder_at, status(scheduled|done|missed)`
- `content_publications`
  - `id, draft_id, provider_post_id(optional), post_url(optional), published_at, source(manual|api)`
- `content_metrics`
  - `id, publication_id, metric_date, impressions, reach, views, likes, comments, shares, saves, clicks, follower_delta`
- `marketplace_import_jobs`
  - `id, user_id, source, status, file_path, created_at`
- `marketplace_products`
  - `id, user_id, source, external_sku, name, category, price_amount, currency, raw_json`
- `marketplace_product_mapping`
  - `id, user_id, source, external_sku, product_id`

## 7) API (Proposed)
### 7.1 Integrations
- `GET /api/v1/integrations`
- `POST /api/v1/integrations/{provider}/connect` (returns connect URL / instructions)
- `POST /api/v1/integrations/{provider}/disconnect`
- `POST /api/v1/integrations/{provider}/sync` (manual trigger)

### 7.2 Calendar & Drafts
- `GET /api/v1/calendar/drafts?from=...&to=...&channel=...`
- `POST /api/v1/calendar/drafts` (create draft)
- `PATCH /api/v1/calendar/drafts/{draft_id}`
- `POST /api/v1/calendar/drafts/{draft_id}/schedule`
- `POST /api/v1/calendar/drafts/{draft_id}/mark-published` (manual publish + post_url)

### 7.3 Analytics
- `GET /api/v1/analytics/overview?from=...&to=...`
- `GET /api/v1/analytics/by-campaign?from=...&to=...`
- `GET /api/v1/analytics/by-channel?from=...&to=...`

### 7.4 Marketplace Import
- `POST /api/v1/marketplace/import` (upload CSV)
- `GET /api/v1/marketplace/import/{job_id}`
- `POST /api/v1/marketplace/mapping` (map SKU)

## 8) Subscription Packaging (Suggested)
### Starter
- Campaign generator + manual posting kit + basic calendar drafts

### Pro
- All channels dashboard + analytics + marketplace import + offer builder + approval workflow

### Business
- Multi-user team + more channels/accounts + automation rules + advanced reporting

## 9) Compliance & Risk Notes
- Official APIs only for production-grade SaaS; expect:
  - platform app review, scope limitations, rate limits
  - TikTok & WhatsApp restrictions differ; plan for staged enablement
- Scheduling-only avoids publish scopes while still giving value
- For v1, allow manual post URL entry to enable analytics even without deep API discovery

## 10) Roadmap (Recommended)
### v1 (Now)
- Integrations hub + calendar drafts + analytics baseline + marketplace CSV import + offer builder output

### v2
- Auto-posting for platforms that allow it
- Inbox-lite (templates + assisted replies) for WhatsApp/DM
- UTM/link tracking + landing page generator + A/B offer variants

### v3
- Closed-loop optimization: suggest next best action based on performance + inventory + margin
