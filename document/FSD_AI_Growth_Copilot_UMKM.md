# FSD (Functional Specification Document) — AI Growth Copilot for SMEs (UMKM)

## 1) Tujuan
Dokumen ini mendefinisikan spesifikasi fungsional MVP “AI Growth Copilot” sebagai “AI Marketing Department” untuk UMKM. Sistem menghasilkan paket kampanye end-to-end (insight → strategi → copy → storyboard → shotlist → prompt PixVerse → video → paket publikasi) dari input produk dalam ≤ 5 menit.

Dokumen ini mencakup:
- Ruang lingkup fitur MVP dan perilaku sistem
- Arsitektur solusi dan tech stack: Java Spring Boot, PostgreSQL, Electron, Docker
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
**Frontend**
- Electron (Desktop App)
- React + TypeScript
- Vite
- Tailwind CSS + shadcn/ui

**Backend**
- Java 21
- Spring Boot 3.x
- Spring Web (REST), Spring Validation
- Spring Security (JWT)
- OpenAPI/Swagger (springdoc)

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
- Electron Desktop App: UI create campaign, progress workflow, dashboard hasil.
- Spring Boot API: autentikasi, CRUD campaign, orkestrasi workflow, integrasi provider AI & PixVerse, penyimpanan output.
- PostgreSQL: persist campaign, step, output, asset metadata.
- MinIO (S3 Object Storage): untuk gambar produk dan video.

### 3.3 Diagram Runtime (logical)
```text
Desktop App (Electron)
   |
   | HTTPS (JWT)
   v
Spring Boot API  -----> OpenAI API
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
- Asset (image/video) hanya dapat diakses oleh pemilik campaign (signed URL atau private bucket).

---

## 5) User Journey & Alur Fungsional

### 5.1 Happy Path
1. User login.
2. User klik “New Campaign”.
3. User isi form produk + upload foto.
4. User klik “Generate Campaign”.
5. Sistem menjalankan workflow multi-agent step-by-step sambil memperbarui status.
6. Sistem menghasilkan video via PixVerse.
7. Sistem menyusun campaign package.
8. User melihat dashboard hasil + copy caption/prompt + download video.

### 5.2 Error Path (contoh)
- OpenAI step gagal (timeout/rate limit): step menjadi `failed`, UI menampilkan alasan ringkas + tombol `Retry Step`.
- PixVerse gagal: step PixVerse `failed`, user dapat retry generate video tanpa mengulang step sebelumnya.

---

## 6) Modul & Fitur (Functional Requirements)

### FR-01 Autentikasi
**Deskripsi**
- User login menggunakan provider autentikasi (MVP: JWT). Strategi integrasi:
  - Opsi A: Spring Boot issue JWT sendiri (email/password sederhana)
  - Opsi B: Integrasi dengan external IdP (JWT verification)

**Acceptance**
- API endpoint yang butuh auth menolak request tanpa token (401).

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
Opsional, bergantung strategi autentikasi. Jika Spring Boot issue JWT sendiri, tabel ini dibutuhkan.

#### `campaigns`
Kolom minimum:
- `id` uuid pk
- `user_id` uuid (atau text jika dari external auth)
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

## 9) API Specification (Spring Boot REST)

### 9.1 Auth
Header:
- `Authorization: Bearer <jwt>`

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
#### POST `/api/v1/campaigns/{campaignId}/assets/product-images`
MVP opsi:
- multipart upload langsung ke Spring Boot (kemudian forward ke storage), atau
- signed URL dari storage (lebih ideal)

Response:
```json
{
  "items": [
    { "id": "uuid", "asset_type": "product_image", "public_url": "https://..." }
  ]
}
```

### 9.4 Start Workflow
#### POST `/api/v1/campaigns/{campaignId}/generate`
Response:
```json
{
  "campaign_id": "uuid",
  "campaign_status": "running",
  "current_step_key": "product_analyst"
}
```

### 9.5 Progress
#### GET `/api/v1/campaigns/{campaignId}/progress`
Response:
```json
{
  "campaign_id": "uuid",
  "campaign_status": "running",
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
  "error": null
}
```

### 9.6 Step Output (untuk dashboard)
#### GET `/api/v1/campaigns/{campaignId}/steps/{stepKey}`
Response:
```json
{
  "step_key": "copywriter",
  "status": "success",
  "output": {}
}
```

### 9.7 Retry Step
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
|  Email: [__________________________]             |
|  Password: [______________________]              |
|                                                  |
|  [ Sign In ]                                     |
|                                                  |
|  (optional) [ Continue with Google ]             |
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
Electron Desktop App berjalan di host machine (bukan container). Docker Compose dipakai untuk menjalankan dependency backend (API, DB, object storage).
Struktur service (docker compose):
- `api` (Spring Boot)
- `db` (PostgreSQL)
- `storage` (MinIO untuk S3 object storage)

Diagram:
```text
docker-compose network
  api:8080  -> db:5432
  api:8080  -> storage:9000
```

Konfigurasi environment minimal:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `PIXVERSE_API_KEY`
- `S3_ENDPOINT` (MinIO)
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`
- `S3_REGION` (opsional)

---

## 13) Acceptance Checklist (MVP Demo)
- User dapat membuat campaign baru dan upload minimal 1 foto.
- Workflow berjalan dan status step tampil di UI.
- Output per step tersimpan dan dapat ditampilkan di dashboard.
- Video PixVerse ≥ 30 detik tampil dan dapat diunduh.
- Retry step PixVerse berfungsi tanpa mengulang step sebelumnya.
