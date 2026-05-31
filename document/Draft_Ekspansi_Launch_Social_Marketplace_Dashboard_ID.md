# Draft Ekspansi Launch — Dashboard Social + Marketplace (Subscription SaaS untuk UMKM)

## 1) Tujuan
Mengembangkan AI Growth Copilot dari “generator campaign” menjadi “operating system” untuk launch UMKM: rencana → produksi konten → penjadwalan → ukur performa → iterasi, dalam satu dashboard.

Draft ini menambahkan fitur minimum yang dibutuhkan agar produk terlihat profesional sebagai subscription SaaS untuk UMKM Indonesia, dengan fokus:
- Manajemen multi-channel (Instagram, TikTok, Facebook, WhatsApp)
- Analitik engagement dalam satu tampilan
- Marketplace sebagai sumber data (mulai dari import manual) untuk offer yang lebih relevan dan stock-aware

## 2) Scope v1 (Keputusan)
### 2.1 Social: semua channel, scheduling draft (tanpa auto-posting dulu)
- Connect account untuk: Instagram, TikTok, Facebook, WhatsApp Business
- Konversi output Campaign menjadi paket konten yang siap dieksekusi
- Buat dan jadwalkan draft di calendar (reminder + checklist untuk publish manual)
- Tarik metrik engagement (sejauh yang didukung official API), tampilkan analitik terpusat

Alasan scheduling-only di v1:
- Menghindari kompleksitas izin publish dan proses review platform
- Tetap memberi value tinggi untuk subscription (planning + eksekusi + evaluasi)
- Mengurangi risiko compliance dan mempercepat time-to-market

### 2.2 Marketplace: manual import dulu
- CSV import: produk, stok, order ringkas (opsional/tergantung data yang tersedia)
- Mapping SKU marketplace ↔ master product internal
- Gunakan sinyal stok/best seller untuk rekomendasi offer dan CTA (mis. “stok terbatas”)

## 3) Modul Produk (Baru)
### 3.1 Integrations
Tujuan: koneksi akun dan status kesehatan integrasi.
- Connect/disconnect per provider
- Info scope/permission + last sync
- Health check + flow reconnect

### 3.2 Content Calendar
Tujuan: mengubah output campaign menjadi rencana eksekusi.
- Calendar view (week/month)
- Draft scheduling per channel
- Checklist per draft (asset ready, caption ready, link ready)
- Reminder in-app

### 3.3 Analytics Dashboard
Tujuan: menunjukkan dampak campaign dan membuktikan value subscription.
- KPI by date range: views/reach, engagement, follower delta, link clicks (jika tersedia)
- Breakdown: channel, campaign, tipe konten, varian offer
- “Next action suggestions” berbasis rules sederhana

### 3.4 Marketplace Import & Mapping
Tujuan: menyatukan data operasional agar marketing lebih tepat.
- CSV importer + mapping field
- Mapping SKU ke internal product
- Stock-aware suggestion: “push produk ini”, “pause promosi”, “gunakan waitlist CTA”

## 4) Functional Requirements (FR) — Ekspansi
### FR-08 Social Connections
- User bisa menambahkan beberapa akun per provider
- Token disimpan aman (encrypted/at rest) dan status koneksi terlihat
- Re-auth saat token expired
Acceptance:
- Status koneksi terlihat; koneksi putus terdeteksi dan bisa dipulihkan

### FR-09 Content Calendar & Draft Scheduling
- Draft item berisi: channel, caption, hashtags, CTA, media URL (image/video), jadwal publish, notes, checklist
- Draft bisa dibuat dari campaign output (recommended) atau manual
Acceptance:
- User bisa membuat draft multi-channel dari satu campaign dan menjadwalkannya

### FR-10 Engagement Sync & Analytics
- Sinkronisasi periodik untuk menarik metrik konten
- Jika API terbatas, user bisa input post URL/ID manual untuk tracking
Acceptance:
- Dashboard menampilkan performa agregat by campaign dan by channel

### FR-11 Marketplace Manual Import
- CSV upload untuk import produk/stok/order ringkas
- Mapping SKU marketplace ↔ product internal
Acceptance:
- Data import bisa dipakai untuk memulai campaign dan rekomendasi offer/CTA

### FR-12 Offer Builder (Launch Offer Profesional)
Tujuan: campaign yang dihasilkan lebih “jualan” dan siap dipakai UMKM.
Input (contoh):
- objective, constraints (no discount / max discount), channel mix
- stok/availability (dari inventory/marketplace import)
Output:
- 5–10 varian offer: mekanik, headline, CTA, alasan, risiko/guardrails, channel recommended
Acceptance:
- Offer bisa langsung diubah menjadi draft calendar (caption + CTA + angle)

## 5) Halaman UI (Tambahan)
### 5.1 Integrations
- List provider + connected accounts + status + last sync
- Tombol connect/disconnect + reconnect

### 5.2 Calendar
- Month/week view
- Filter: channel, campaign, status
- Draft detail drawer: caption/hashtags/CTA/media/jadwal/checklist/notes

### 5.3 Analytics
- Date range picker
- KPI cards + chart
- Tabel breakdown by campaign/channel
- Next action suggestions (rules)

### 5.4 Marketplace Import
- Upload CSV → preview → mapping → import
- Ringkasan hasil import + error per baris

## 6) Data Model (Usulan)
Tabel konseptual:
- `integrations`
- `content_drafts`, `content_schedule`, `content_publications`, `content_metrics`
- `marketplace_import_jobs`, `marketplace_products`, `marketplace_product_mapping`

## 7) API (Usulan)
### Integrations
- `GET /api/v1/integrations`
- `POST /api/v1/integrations/{provider}/connect`
- `POST /api/v1/integrations/{provider}/disconnect`
- `POST /api/v1/integrations/{provider}/sync`

### Calendar & Drafts
- `GET /api/v1/calendar/drafts?from=...&to=...&channel=...`
- `POST /api/v1/calendar/drafts`
- `PATCH /api/v1/calendar/drafts/{draft_id}`
- `POST /api/v1/calendar/drafts/{draft_id}/schedule`
- `POST /api/v1/calendar/drafts/{draft_id}/mark-published` (manual + post_url)

### Analytics
- `GET /api/v1/analytics/overview?from=...&to=...`
- `GET /api/v1/analytics/by-campaign?from=...&to=...`
- `GET /api/v1/analytics/by-channel?from=...&to=...`

### Marketplace Import
- `POST /api/v1/marketplace/import`
- `GET /api/v1/marketplace/import/{job_id}`
- `POST /api/v1/marketplace/mapping`

## 8) Catatan Compliance & Risiko
- Untuk SaaS production-grade, prioritaskan official APIs (rate limit, scope, review)
- Scheduling-only menurunkan kebutuhan scope publish sambil tetap memberi value tinggi
- Sediakan input manual post URL/ID agar analytics tetap bisa jalan meski API terbatas

## 9) Roadmap (Rekomendasi)
- v1: Integrations hub + calendar drafts + analytics baseline + marketplace CSV import + offer builder
- v2: auto-posting (per platform yang memungkinkan) + inbox-lite (template + assisted replies)
- v3: closed-loop optimization (recommend next best action berbasis performance + inventory + margin)
