# FSD (Functional Specification Document) — AI Growth Copilot for SMEs (UMKM)

## 1) Tujuan
Dokumen ini mendefinisikan spesifikasi fungsional MVP “AI Growth Copilot” sebagai “AI Marketing Department” untuk UMKM. Sistem menghasilkan paket kampanye end-to-end (insight → strategi → copy → storyboard → shotlist → prompt PixVerse → video → paket publikasi) dari input produk dalam ≤ 5 menit.

Dokumen ini mencakup:
- Ruang lingkup fitur MVP dan perilaku sistem
- Arsitektur solusi dan tech stack: Python (FastAPI), PostgreSQL, Web UI (React+Vite), Docker
- Spesifikasi API (kontrak request/response) dan status workflow
- Skema database (PostgreSQL) dan aturan akses
- Mockup desain (wireframe) untuk halaman utama MVP

---

## 2) Definisi & Istilah
- Campaign: proyek kampanye untuk 1 produk (atau varian) yang menghasilkan output pemasaran.
- Step: tahap agent dalam workflow (Product Analyst, Strategist, dst).
- Package: agregasi final yang siap dipakai untuk publikasi.
- PixVerse: provider pembuatan video promosi dari prompt.

---

## 3) Tech Stack & Arsitektur

### 3.1 Tech Stack
**Frontend (Implementasi Demo Saat Ini)**
- Web app: React + TypeScript
- Vite
- Tailwind CSS

**Backend**
- Python 3.12+
- FastAPI (REST) + Pydantic (validation)
- Uvicorn (ASGI server)
- Auth: API key via header `X-API-Key`
- OpenAPI/Swagger (built-in FastAPI)

**Database**
- PostgreSQL 15+

**AI & Video Provider**
- OpenAI API (text multi-agent structured output)
- PixVerse API (video generation)

**Infra**
- Docker + Docker Compose (dev)
- Reverse proxy opsional (Nginx) untuk routing API

### 3.2 Arsitektur Layanan (MVP)
Komponen utama:
- Web App: UI create campaign, progress workflow, dashboard hasil.
- Python API (FastAPI): autentikasi, CRUD campaign, orkestrasi workflow, integrasi provider AI & PixVerse, penyimpanan output.
- PostgreSQL: persist campaign, step, output, asset metadata.
- MinIO (S3 Object Storage): untuk gambar produk dan video.

### 3.3 Diagram Runtime (logical)
```text
Web App (React/Vite)
   |
   | HTTP (X-API-Key)
   v
Python API (FastAPI)  -----> OpenAI API
   |     |
   |     +-----> PixVerse API (create + poll)
   |
   +-----> PostgreSQL (campaigns, steps, assets)
   |
  +-----> MinIO (product images, rendered video)
```

### 3.4 Prinsip Desain (MVP)
- Output terstruktur: semua agent wajib JSON sesuai schema.
- Workflow recoverable: status dan output disimpan per step, UI dapat refresh tanpa kehilangan progres.
- Retry per-step: retry tidak menggandakan output final (idempotent).
- Observability: simpan `duration_ms`, `error_code`, `error_message` ringkas.

---

## 4) Peran Pengguna & Hak Akses
### 4.1 Roles
- User (Owner UMKM): membuat campaign, menjalankan generate, melihat hasil, download/copy asset.
- Admin (opsional): melihat semua campaign (untuk demo/internal).

### 4.2 Aturan Akses (MVP)
- User hanya dapat mengakses campaign miliknya.
- Untuk demo, asset dibentuk sebagai `public_url` dari MinIO. Untuk produksi, direkomendasikan memakai signed URL / bucket private per user.

---

## 5) User Journey & Alur Fungsional

### 5.1 Happy Path
1. User login.
2. User klik “New Campaign”.
3. User memilih sumber data produk:
   - Opsi A: pilih produk dari Inventory (autofill data + konteks stok), atau
   - Opsi B: isi form produk manual.
4. User upload foto produk (jika belum ada).
5. User klik “Generate Campaign”.
6. Sistem membuat snapshot produk+stok (read-only) untuk campaign.
7. Sistem menjalankan workflow multi-agent step-by-step sambil memperbarui status.
8. Sistem menghasilkan video via PixVerse.
9. Sistem menyusun campaign package.
10. User melihat dashboard hasil + copy caption/prompt + download video.

### 5.2 Error Path (contoh)
- OpenAI step gagal (timeout/rate limit): step menjadi `failed`, UI menampilkan alasan ringkas + tombol `Retry Step`.
- PixVerse gagal: step PixVerse `failed`, user dapat retry generate video tanpa mengulang step sebelumnya.

---

## 6) Modul & Fitur (Functional Requirements)

### FR-01 Autentikasi
**Deskripsi**
- User login/register untuk mendapatkan API key (disimpan di UI).
- Semua endpoint protected wajib header `X-API-Key`.

**Acceptance**
- API endpoint yang butuh auth menolak request tanpa `X-API-Key` (401).

### FR-02 Campaign Management (CRUD)
**Deskripsi**
- List campaign (dengan status)
- Create campaign (draft)
- Update campaign draft (sebelum generate)
- View campaign detail

**Acceptance**
- User hanya melihat campaign milik sendiri.

### FR-03 Product Upload
**Deskripsi**
- Upload 1–5 foto produk.
- Store ke Storage Service.
- Simpan metadata asset (path, mime, size).

**Acceptance**
- Minimal 1 foto; jika tidak ada, tombol generate disabled.

### FR-04 Multi-Agent Orchestration
**Deskripsi**
Workflow step keys (MVP):
1) `product_analyst`
2) `marketing_strategist`
3) `copywriter`
4) `creative_director`
5) `video_director`
6) `pixverse`
7) `campaign_manager`

**Acceptance**
- Status per step: `queued | running | success | failed`
- Output JSON disimpan per step
- Kesalahan disimpan dengan `retryable` boolean

### FR-05 Workflow Visualization (Progress)
**Deskripsi**
- UI menampilkan timeline step dan status
- Update status secara real-time semu via polling endpoint progress (1–2 detik)

**Acceptance**
- Refresh halaman tidak menghilangkan progress.

### FR-06 Campaign Dashboard & Export
**Deskripsi**
- Menampilkan hasil per section: Insight, Strategy, Copy, Storyboard, Shotlist, PixVerse Prompt, Video
- Copy-to-clipboard untuk caption/hashtag/prompt
- Download JSON (package) dan download video

**Acceptance**
- Setelah complete, semua section bisa diakses.

### FR-07 Product Catalog & Inventory (Data Only)
**Deskripsi**
- Sistem menyimpan master data produk dan stok sebagai data operasional (non-AI).
- Campaign dapat memilih `product_id` untuk autofill data produk dan mengambil konteks stok.
- Saat generate dimulai, backend membuat `campaign_product_snapshot` (copy JSON) dari product + inventory supaya:
  - AI hanya membaca snapshot (tidak baca tabel inventory langsung).
  - Output AI tidak bercampur dengan data inventory.
  - Hasil campaign stabil walau stok berubah setelah generate.

**Acceptance**
- CRUD produk dan inventory tidak mengubah output campaign yang sudah berjalan/selesai.
- Snapshot dibuat sekali per generate dan direferensikan oleh campaign.

### FR-08 Integrations Hub (Ekspansi Subscription)
**Deskripsi**
- User dapat menghubungkan akun: Instagram, TikTok, Facebook, WhatsApp Business.
- Sistem menyimpan status koneksi (ok/expired/error), scope/permission, dan waktu sync terakhir.
- Mendukung reconnect/re-auth saat token expire.

**Acceptance**
- User dapat melihat status koneksi per provider dan memperbaiki koneksi yang putus.

### FR-09 Content Calendar (Scheduling Draft, Tanpa Auto-Posting di v1)
**Deskripsi**
- Dari output campaign, user bisa membuat draft konten per channel (caption/hashtags/CTA/media URL/notes).
- User bisa menjadwalkan draft di kalender (week/month view) dengan reminder dan checklist publish manual.

**Acceptance**
- User dapat membuat dan menjadwalkan draft multi-channel dari satu campaign.

### FR-10 Analytics Dashboard (Engagement Terpusat)
**Deskripsi**
- Sistem melakukan sync metrik engagement (sejauh didukung official API) dan menampilkan agregasi:
  - by channel
  - by campaign
  - by tipe konten/varian offer
- Jika API terbatas, user dapat mengisi `post_url`/`provider_post_id` secara manual untuk tracking.

**Acceptance**
- User dapat melihat performa per campaign dan per channel pada rentang tanggal.

### FR-11 Marketplace Manual Import (CSV)
**Deskripsi**
- Import CSV untuk produk/stok/order ringkas (opsional) dan mapping SKU marketplace ↔ master product internal.
- Data import dapat dipakai untuk:
  - autofill saat create campaign
  - CTA stock-aware (mis. “stok terbatas”)
  - rekomendasi offer

**Acceptance**
- User dapat upload CSV, melihat preview + mapping, dan hasil import muncul di Product/Inventory.

### FR-12 Offer Builder (Launch Offer Profesional)
**Deskripsi**
- Sistem menghasilkan varian offer yang lebih “jualan” (mekanik promo, headline, CTA, guardrails) untuk tiap campaign.
- Offer bisa dikonversi menjadi draft kalender (caption + CTA + angle).

**Acceptance**
- Offer output bersifat copy-ready dan dapat dibuat draft per channel tanpa edit besar.

---

## 7) Non-Functional Requirements (NFR)
**Performance**
- Median waktu generate: < 5 menit (termasuk PixVerse).
- Polling progress: default 1500ms (konfigurabel).

**Reliability**
- Retry per step (maks 3 kali) sebelum user diminta edit input.
- Idempotency: start generate yang sama tidak membuat step duplikat.

**Security**
- Jangan log token/API key.
- Rate limit endpoint generate (per user).
- Token integrasi disimpan aman (encrypted/at rest), tidak pernah ditampilkan penuh di UI/log.
- Audit event minimal untuk aksi sensitif: connect/disconnect, sync, import.

**Observability**
- Record: `started_at`, `finished_at`, `duration_ms`, `error_code`, `error_message`.

---

## 8) Database Design (PostgreSQL)

### 8.1 Enum
```sql
-- status campaign
-- draft | running | complete | failed
-- status step
-- queued | running | success | failed
```

### 8.2 Tables (MVP)
#### `users`
Tabel user dipakai untuk login/register dan kepemilikan data.

#### `products`
- `id` uuid pk
- `user_id` uuid (atau text jika dari external auth)
- `sku` text unique per user
- `name` text
- `base_description` text
- `category` text
- `base_price_amount` numeric
- `price_currency` text default 'IDR'
- `created_at`, `updated_at` timestamptz

#### `inventory`
- `id` uuid pk
- `product_id` uuid fk
- `location_code` text
- `qty_on_hand` int
- `qty_reserved` int default 0
- `updated_at` timestamptz
- unique constraint: `(product_id, location_code)`

#### `campaigns`
Kolom minimum:
- `id` uuid pk
- `user_id` uuid (atau text jika dari external auth)
- `product_id` uuid null
- `product_snapshot_id` uuid null
- `product_name` text
- `product_description` text
- `price_amount` numeric
- `price_currency` text default 'IDR'
- `category` text
- `brand_tone` text null
- `target_location` text null
- `primary_goal` text null
- `status` text
- `created_at`, `updated_at` timestamptz

#### `campaign_product_snapshots`
- `id` uuid pk
- `campaign_id` uuid fk
- `product_id` uuid fk null
- `snapshot_json` jsonb
- `created_at` timestamptz
- unique constraint: `(campaign_id)`

#### `campaign_steps`
- `id` uuid pk
- `campaign_id` uuid fk
- `step_key` text
- `status` text
- `started_at`, `finished_at` timestamptz null
- `duration_ms` bigint null
- `output_json` jsonb null
- `error_code` text null
- `error_message` text null
- `retryable` boolean default false
- `attempt` int default 1
- unique constraint: `(campaign_id, step_key)` untuk idempotency

#### `campaign_assets`
- `id` uuid pk
- `campaign_id` uuid fk
- `asset_type` text (`product_image` | `pixverse_video`)
- `storage_provider` text (`minio` | `s3` | `local`)
- `storage_path` text
- `public_url` text null
- `metadata` jsonb null (size, mime, duration, aspect_ratio)
- `created_at` timestamptz

---

## 9) API Specification (FastAPI REST)

### 9.1 Auth
Public:
- `GET /health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

Protected header:
- `X-API-Key: ak_...`

Error standar:
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

### 9.2 Campaign CRUD
#### GET `/api/v1/campaigns`
Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "product_name": "string",
      "status": "draft",
      "created_at": "2026-05-30T00:00:00Z"
    }
  ]
}
```

#### POST `/api/v1/campaigns`
Request:
```json
{
  "product_id": "uuid (optional)",
  "product_name": "Iced Caramel Latte",
  "product_description": "Kopi premium dengan sirup caramel dan susu segar.",
  "price": { "currency": "IDR", "amount": 25000 },
  "category": "Coffee",
  "brand_tone": "hangat, premium, friendly",
  "target_location": "Jakarta",
  "primary_goal": "conversion"
}
```
Response:
```json
{ "id": "uuid", "status": "draft" }
```

Catatan:
- Jika `product_id` diisi, field product_* dapat di-autofill oleh backend dari `products` (boleh tetap dikirim untuk override draft).

#### GET `/api/v1/campaigns/{campaignId}`
Response:
```json
{
  "id": "uuid",
  "product_name": "string",
  "product_description": "string",
  "price": { "currency": "IDR", "amount": 25000 },
  "category": "string",
  "status": "running",
  "assets": [
    { "id": "uuid", "asset_type": "product_image", "public_url": "https://..." }
  ]
}
```

### 9.3 Upload Asset
#### Upload via backend (dipakai UI saat ini)
`POST /api/v1/campaigns/{campaignId}/assets/product-images/upload` (multipart `files`)

#### Presign PUT (opsional)
`POST /api/v1/campaigns/{campaignId}/assets/product-images/presign`

#### Commit setelah presign (opsional)
`POST /api/v1/campaigns/{campaignId}/assets/product-images/commit`

Response:
```json
{
  "items": [
    { "id": "uuid", "asset_type": "product_image", "public_url": "https://..." }
  ]
}
```

### 9.4 Product Catalog
#### GET `/api/v1/products`
Response:
```json
{
  "items": [
    { "id": "uuid", "sku": "SKU-001", "name": "Iced Caramel Latte", "category": "Coffee" }
  ]
}
```

#### POST `/api/v1/products`
Request:
```json
{
  "sku": "SKU-001",
  "name": "Iced Caramel Latte",
  "base_description": "Kopi premium…",
  "category": "Coffee",
  "base_price": { "currency": "IDR", "amount": 25000 }
}
```
Response:
```json
{ "id": "uuid" }
```

#### GET `/api/v1/products/{productId}`
Response:
```json
{
  "id": "uuid",
  "sku": "SKU-001",
  "name": "Iced Caramel Latte",
  "base_description": "Kopi premium…",
  "category": "Coffee",
  "base_price": { "currency": "IDR", "amount": 25000 }
}
```

### 9.5 Inventory
#### GET `/api/v1/products/{productId}/inventory`
Response:
```json
{
  "items": [
    { "location_code": "MAIN", "qty_on_hand": 120, "qty_reserved": 10, "updated_at": "2026-05-30T00:00:00Z" }
  ]
}
```

#### PUT `/api/v1/products/{productId}/inventory/{locationCode}`
Request:
```json
{ "qty_on_hand": 120, "qty_reserved": 10 }
```
Response:
```json
{ "location_code": "MAIN", "qty_on_hand": 120, "qty_reserved": 10 }
```

### 9.6 Start Workflow
#### POST `/api/v1/campaigns/{campaignId}/generate`
Response:
```json
{
  "campaign_id": "uuid",
  "campaign_status": "running",
  "current_step_key": "product_analyst"
}
```

### 9.7 Progress
#### GET `/api/v1/campaigns/{campaignId}/progress`
Response:
```json
{
  "campaign_id": "uuid",
  "campaign_status": "running",
  "approval_status": "none",
  "current_step_key": "pixverse",
  "steps": [
    { "step_key": "product_analyst", "status": "success", "duration_ms": 8420 },
    { "step_key": "marketing_strategist", "status": "success", "duration_ms": 9100 },
    { "step_key": "copywriter", "status": "success", "duration_ms": 7800 },
    { "step_key": "creative_director", "status": "success", "duration_ms": 6500 },
    { "step_key": "video_director", "status": "success", "duration_ms": 6100 },
    { "step_key": "pixverse", "status": "running" },
    { "step_key": "campaign_manager", "status": "queued" }
  ],
  "error": null,
  "action_required": null
}
```

### 9.10 Approval Storyboard
Saat `approval_status=pending_storyboard`, UI perlu meminta user approve/reject.

#### POST `/api/v1/campaigns/{campaignId}/storyboard/approve`
Response: sama seperti `GET /progress`

#### POST `/api/v1/campaigns/{campaignId}/storyboard/reject`
Response:
```json
{ "status": "draft" }
```

### 9.8 Step Output (untuk dashboard)
#### GET `/api/v1/campaigns/{campaignId}/steps/{stepKey}`
Response:
```json
{
  "step_key": "copywriter",
  "status": "success",
  "output": {}
}
```

### 9.9 Retry Step
#### POST `/api/v1/campaigns/{campaignId}/steps/{stepKey}/retry`
Response:
```json
{ "step_key": "pixverse", "status": "queued" }
```

---

## 10) Workflow Processing Model (MVP)
Rekomendasi implementasi (sederhana dan aman untuk demo):
- `POST /generate` hanya men-queue step dan memulai eksekusi asynchronous internal (executor thread pool).
- `GET /progress` membaca DB untuk status terbaru.

State machine:
- Jika step `success` → queue step berikutnya.
- Jika step `failed` → stop workflow dan set campaign `failed` (kecuali step dinyatakan optional).
- Jika PixVerse `running` → polling provider dilakukan oleh backend scheduler internal sampai selesai/timeout.

Timeout guideline:
- Text steps (OpenAI): 60–120 detik
- PixVerse: 3–5 menit (tergantung provider), dengan polling interval 5–10 detik

---

## 11) Mockup Design (Wireframe)

### 11.1 Halaman: Login
```text
+--------------------------------------------------+
| AI Growth Copilot                                |
|                                                  |
|  Username: [_______________________]             |
|  Password: [______________________]              |
|                                                  |
|  [ Login ]   [ Daftar ]                          |
|                                                  |
+--------------------------------------------------+
```

### 11.2 Halaman: Campaign List
```text
+--------------------------------------------------------------------------------+
| AI Growth Copilot                         [New Campaign]   [Profile]          |
|--------------------------------------------------------------------------------|
| Campaigns                                                                       |
|  [Search...]                                                                   |
|                                                                                |
|  +-----------------------+   +-----------------------+                         |
|  | Iced Caramel Latte     |   | Brownies Box         |                         |
|  | Status: running        |   | Status: complete     |                         |
|  | Updated: 5m ago        |   | Updated: yesterday   |                         |
|  | [Open]                 |   | [Open] [Export]      |                         |
|  +-----------------------+   +-----------------------+                         |
|                                                                                |
+--------------------------------------------------------------------------------+
```

### 11.3 Halaman: Create Campaign
```text
+--------------------------------------------------------------------------------+
| [Back] New Campaign                                                            |
|--------------------------------------------------------------------------------|
| Product Info                                                                    |
|  Name        : [_____________________________]                                 |
|  Description : [______________________________________________]                |
|               [______________________________________________]                |
|  Price (IDR) : [__________]   Category: [___________ v]                        |
|                                                                                |
| Campaign Options (optional)                                                     |
|  Brand tone     : [hangat, premium, friendly]                                  |
|  Location target: [Jakarta______________]                                      |
|  Goal           : [conversion v]                                               |
|                                                                                |
| Product Images                                                                  |
|  [ + Upload ]  (1–5 images)                                                    |
|  [thumb] [thumb] [thumb]                                                      |
|                                                                                |
|                                  [ Generate Campaign ]                         |
+--------------------------------------------------------------------------------+
```

### 11.4 Halaman: Campaign Detail (Workflow + Dashboard)
```text
+--------------------------------------------------------------------------------+
| [Back] Campaign: Iced Caramel Latte                  Status: RUNNING           |
|--------------------------------------------------------------------------------|
| Left: Workflow Timeline                | Right: Live Preview / Output           |
|----------------------------------------+----------------------------------------|
| ✓ Product Analyst      (success)       | Insight (ringkas)                       |
| ✓ Marketing Strategist (success)       | - USP: ...                              |
| ✓ Copywriter           (success)       | - Target: ...                           |
| ⟳ Creative Director    (running)       |                                        |
| • Video Director       (queued)        |                                        |
| • PixVerse             (queued)        |                                        |
| • Campaign Manager     (queued)        |                                        |
|                                        | [Retry step] (muncul saat failed)       |
|----------------------------------------+----------------------------------------|
| Tabs: [Dashboard] [Assets] [JSON Export] [Logs]                                 |
|--------------------------------------------------------------------------------|
| Dashboard (saat complete)                                                       |
|  - Strategy                                                                       |
|  - Captions (IG/TikTok/FB/WA) [Copy]                                             |
|  - Storyboard                                                                    |
|  - Shotlist                                                                      |
|  - PixVerse Prompt [Copy]                                                        |
|  - Video Player [Download]                                                       |
+--------------------------------------------------------------------------------+
```

### 11.5 Halaman: Assets
```text
+--------------------------------------------------------------------------------+
| Assets                                                                          |
|--------------------------------------------------------------------------------|
| Product Images: [thumb] [thumb]                                                |
| Video: [▶ Player]     [Download MP4]                                           |
|                                                                                |
+--------------------------------------------------------------------------------+
```

---

## 12) Docker (Dev) — Layout Rekomendasi
Implementasi demo saat ini menjalankan Web UI + API + dependency via Docker Compose.
Struktur service (docker compose):
- `api` (Python FastAPI)
- `web` (Vite dev server untuk React UI)
- `db` (PostgreSQL)
- `storage` (MinIO untuk S3 object storage)
- `minio-init` (inisialisasi bucket/policy)

Diagram:
```text
docker-compose network
  web:5173  -> api:8000
  api:8000  -> db:5432
  api:8000  -> storage:9000
```

Konfigurasi environment minimal:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `S3_ENDPOINT` (MinIO)
- `PUBLIC_S3_BASE_URL` (URL yang bisa diakses browser untuk public URL/presign)
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`
- `S3_REGION` (opsional)
- `DEMO_API_KEY` (opsional untuk demo)

---

## 13) Acceptance Checklist (MVP Demo)
- User dapat membuat campaign baru dan upload minimal 1 foto.
- Workflow berjalan dan status step tampil di UI.
- Output per step tersimpan dan dapat ditampilkan di dashboard.
- Video PixVerse ≥ 30 detik tampil dan dapat diunduh.
- Retry step PixVerse berfungsi tanpa mengulang step sebelumnya.

---

## 14) Ekspansi “Launch Dashboard” (Draft untuk Subscription)
Bagian ini merangkum rancangan tingkat tinggi untuk fitur profesional launch: integrations → kalender draft → analytics → marketplace import.

### 14.1 API (Proposed)
**Integrations**
- `GET /api/v1/integrations`
- `POST /api/v1/integrations/{provider}/connect`
- `POST /api/v1/integrations/{provider}/disconnect`
- `POST /api/v1/integrations/{provider}/sync`

**Calendar & Drafts**
- `GET /api/v1/calendar/drafts?from=...&to=...&channel=...`
- `POST /api/v1/calendar/drafts`
- `PATCH /api/v1/calendar/drafts/{draft_id}`
- `POST /api/v1/calendar/drafts/{draft_id}/schedule`
- `POST /api/v1/calendar/drafts/{draft_id}/mark-published` (manual publish + `post_url`)

**Analytics**
- `GET /api/v1/analytics/overview?from=...&to=...`
- `GET /api/v1/analytics/by-campaign?from=...&to=...`
- `GET /api/v1/analytics/by-channel?from=...&to=...`

**Marketplace Import**
- `POST /api/v1/marketplace/import` (CSV upload)
- `GET /api/v1/marketplace/import/{job_id}`
- `POST /api/v1/marketplace/mapping` (map SKU ↔ product)

### 14.2 Data Model (Proposed)
Tabel konseptual (detail final mengikuti kebutuhan provider dan compliance):
- `integrations` (provider, account id, status, scopes, token ref, last sync)
- `content_drafts` (draft per channel: caption/hashtags/CTA/media URLs)
- `content_schedule` (jadwal publish + reminder)
- `content_publications` (post URL/ID jika sudah dipublish manual)
- `content_metrics` (metrik per hari/per post untuk analytics)
- `marketplace_import_jobs`, `marketplace_products`, `marketplace_product_mapping`
