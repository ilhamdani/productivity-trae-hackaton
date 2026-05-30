# AI Growth Copilot (UMKM) — MVP Implementation Plan

> **Catatan:** Saya memakai skill **writing-plans** untuk membuat implementation plan.
>
> **For agentic workers:** Gunakan checkbox (`- [ ]`) untuk tracking eksekusi task-by-task.

**Goal:** Membangun MVP “AI Growth Copilot” full-stack (FastAPI + PostgreSQL + MinIO + React Web) yang bisa generate campaign package multi-agent dan video via PixVerse CLI, dengan gate approval storyboard sebelum lanjut ke video.

**Architecture:** Semua service dijalankan via Docker Compose. Frontend (React Web) memanggil FastAPI lewat REST. Backend menyimpan state campaign+step di PostgreSQL, menyimpan asset di MinIO, menjalankan orchestrator internal (worker loop) untuk mengeksekusi step agent berurutan. Setelah step storyboard selesai, workflow berhenti pada state “waiting_approval” sampai user approve/reject di UI.

**Tech Stack:** Python 3.12+, FastAPI, Pydantic, SQLAlchemy, PostgreSQL, MinIO (S3), React + TypeScript + Vite, Tailwind + shadcn/ui, PixVerse CLI (npm `pixverse`), OpenAI API.

---

## Summary
- Implementasi MVP end-to-end sesuai [PRD_Teknis_AI_Growth_Copilot_UMKM.md](file:///d:/2026/Project/productivity-trae-hackaton/document/PRD_Teknis_AI_Growth_Copilot_UMKM.md) dan [FSD_AI_Growth_Copilot_UMKM.md](file:///d:/2026/Project/productivity-trae-hackaton/document/FSD_AI_Growth_Copilot_UMKM.md), plus requirement tambahan:
  - Pembuatan modul masing-masing agent (product analyst → campaign manager).
  - Storyboard (creative_director) harus ada preview + approval user sebelum workflow lanjut ke video.
  - Step PixVerse memakai PixVerse CLI (async, ada `video_id`/request id) untuk create + wait/poll + download.
- Auth MVP menggunakan API key sederhana (header `X-API-Key`), bukan JWT login.
- Upload gambar produk menggunakan Signed URL MinIO (desktop upload langsung ke MinIO).

## Current State Analysis
- Workspace code kosong: folder [sells-growth](file:///d:/2026/Project/productivity-trae-hackaton/sells-growth) belum berisi source code.
- Spesifikasi tersedia di folder [document](file:///d:/2026/Project/productivity-trae-hackaton/document).

## Assumptions & Decisions (Locked)
- **Repo root untuk implementasi:** `d:/2026/Project/productivity-trae-hackaton/sells-growth/` (semua code baru dibuat di sini).
- **Monorepo layout:**
  - `services/api/` untuk FastAPI
  - `apps/web/` untuk React Web UI
  - `infra/` untuk docker-compose (Postgres + MinIO + API + tooling)
- **Docker-first:** tidak ada instalasi dependency di host (pip/npm). Semua build/test/run dilakukan di container.
- **Dockerfile per app:**
  - `services/api/Dockerfile`
  - `apps/web/Dockerfile`
- **Auth:** setiap request ke `/api/v1/**` wajib header `X-API-Key`. Backend memetakan API key → `user_id` (db table `api_keys`).
- **Workflow gate storyboard:**
  - Tambah `campaigns.approval_status` (`none|pending_storyboard|approved_storyboard|rejected_storyboard`) agar tidak perlu menambah step_key baru.
  - Setelah `creative_director` success, orchestrator set `approval_status=pending_storyboard` dan berhenti men-queue step berikutnya.
  - Endpoint baru `POST /api/v1/campaigns/{id}/storyboard/approve` dan `POST /api/v1/campaigns/{id}/storyboard/reject`.
- **PixVerse duration ≥ 30 detik:** PixVerse CLI create video umumnya 1–15s. Untuk memenuhi PRD, pipeline default:
  - Generate base 15s.
  - Extend 2x (atau concat) sampai total durasi ≥ 30s.
  - Validasi durasi hasil via `ffprobe` (ffmpeg).
- **Backend async execution (MVP):** single-process internal worker loop (async task) yang:
  - Men-queue step pertama saat `/generate`.
  - Mengeksekusi satu campaign per waktu (atau concurrency kecil) agar stabil untuk demo.
- **OpenAI structured output:** gunakan Pydantic model untuk memvalidasi output JSON per agent (schema draft di PRD diadopsi sebagai Pydantic types).

## Proposed Changes (Files & Responsibilities)

### Repo scaffolding
- Create: `infra/docker-compose.yml` → Postgres + MinIO + api + init bucket/migrate untuk dev.
- Create: `infra/minio-init/` → job init bucket/policy (sekali saat compose start).
- Create: `infra/api.env.example` dan `infra/web.env.example` → env per service.
- Create: `services/api/` → FastAPI app, DB models/migrations, orchestrator, providers (OpenAI, PixVerse CLI, MinIO signed URL).
- Create: `apps/web/` → React Web UI: login API key (settings), create campaign, progress timeline, output dashboard, storyboard approval modal.

### Backend API (FastAPI)
- Create: `services/api/app/main.py` → app bootstrap, router, startup worker.
- Create: `services/api/app/auth.py` → dependency validate `X-API-Key`.
- Create: `services/api/app/db/` → engine/session, models, migrations.
- Create: `services/api/app/routes/` → endpoints campaigns/products/inventory/assets/workflow.
- Create: `services/api/app/orchestrator/` → workflow state machine, step execution & retry, approval gate.
- Create: `services/api/app/agents/` → 7 agent modules (pydantic output + prompt builder).
- Create: `services/api/app/providers/` → OpenAI client wrapper, MinIO client wrapper (presign), PixVerse CLI adapter (create/wait/download/extend).

### Frontend app (React Web)
- Create: `apps/web/src/pages/` → Login/Settings, Campaign List, New Campaign, Campaign Detail.
- Create: `apps/web/src/components/` → StepTimeline, OutputPane, AssetViewer, ErrorBanner, ApprovalDialog.
- Create: `apps/web/src/api/` → typed client untuk FastAPI endpoints + polling.

---

# Task Breakdown (Execution Checklist)

## Task 0 — Bootstrap repo layout
**Files:**
- Create: `d:/2026/Project/productivity-trae-hackaton/sells-growth/README.md`
- Create: `d:/2026/Project/productivity-trae-hackaton/sells-growth/infra/docker-compose.yml`
- Create: `d:/2026/Project/productivity-trae-hackaton/sells-growth/infra/.env.example`
- Create: `d:/2026/Project/productivity-trae-hackaton/sells-growth/infra/minio-init/` (init bucket)
- Create: `d:/2026/Project/productivity-trae-hackaton/sells-growth/infra/pixverse/Dockerfile` (helper pixverse CLI)
- Create: `d:/2026/Project/productivity-trae-hackaton/sells-growth/services/api/Dockerfile`
- Create: `d:/2026/Project/productivity-trae-hackaton/sells-growth/services/api/requirements.txt`
- Create: `d:/2026/Project/productivity-trae-hackaton/sells-growth/apps/web/Dockerfile`
- Create: `d:/2026/Project/productivity-trae-hackaton/sells-growth/apps/web/package.json` (via scaffolding)

- [ ] **Step 0.1: Buat struktur folder**
  - Buat folder: `infra/`, `services/api/`, `apps/web/`, `scripts/`.

- [ ] **Step 0.2: Setup docker compose (Postgres + MinIO + API + Desktop + PixVerse helper)**
  - `docker-compose.yml` minimal (docker-first):
    - `db` postgres 15, expose 5432
    - `storage` minio, expose 9000/9001
    - `minio-init` (one-shot): create bucket `aigrowthcopilot`
    - `api` fastapi container expose 8000 (depends_on db+storage)
    - `web` container untuk menjalankan UI React (Vite) expose 5173
    - `pixverse` helper container (Node 20 + pixverse CLI) tanpa expose port (dipakai via `docker compose run`)
  - `.env.example` memuat:
    - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
    - `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
    - `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`
    - `OPENAI_API_KEY`
    - `PIXVERSE_WORKSPACE_ID` (optional)

- [ ] **Step 0.3: Konvensi dev**
  - Tentukan port:
    - API: `http://localhost:8000`
    - Postgres: `localhost:5432`
    - MinIO: `http://localhost:9000` (API) dan `http://localhost:9001` (console)
    - Web UI: `http://localhost:5173`

**Verification:**
- Jalankan semua via Docker Compose:
  - `docker compose up -d --build`
  - `docker compose ps` menunjukkan `db`, `storage`, `api` healthy, serta `minio-init` selesai.

---

## Task 1 — Backend skeleton (FastAPI + config + auth API-key)
**Files:**
- Create: `services/api/app/main.py`
- Create: `services/api/app/settings.py`
- Create: `services/api/app/auth.py`
- Create: `services/api/app/errors.py`
- Create: `services/api/app/routes/health.py`
- Create: `services/api/tests/test_health.py`

- [ ] **Step 1.1: Tambah dependencies backend**
  - `requirements.txt` (minimum):
    - `fastapi`
    - `uvicorn[standard]`
    - `pydantic`
    - `pydantic-settings`
    - `sqlalchemy`
    - `psycopg[binary]`
    - `httpx`
    - `pytest`
    - `minio`
    - `openai`

- [ ] **Step 1.2: Implement settings + error envelope**
  - `Settings` memuat:
    - `DATABASE_URL`
    - `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
    - `OPENAI_API_KEY`
    - `API_KEYS` (comma-separated list) atau table `api_keys` (dipilih di Task 2)
    - `PIXVERSE_WORKSPACE_ID` (optional)
    - Polling config: `PROGRESS_POLL_MS`, `PIXVERSE_POLL_SEC`

- [ ] **Step 1.3: Implement auth dependency**
  - Semua router (kecuali `/health`) require header `X-API-Key`.
  - Jika invalid → 401 dengan format error standar FSD.

- [ ] **Step 1.4: Tambah endpoint health**
  - `GET /health` return `{ "status": "ok" }`.

- [ ] **Step 1.5: Tests**
  - `pytest` untuk:
    - `/health` sukses tanpa auth.
    - Endpoint protected menolak tanpa `X-API-Key`.

**Verification:**
- Semua verifikasi dijalankan di container (tanpa install host):
  - `docker compose run --rm api pytest -q`
  - `curl http://localhost:8000/health`

---

## Task 2 — Database schema + access layer
**Files:**
- Create: `services/api/app/db/engine.py`
- Create: `services/api/app/db/models.py`
- Create: `services/api/app/db/migrate.py` (simple migration runner) *atau* `alembic/` (jika memilih Alembic)
- Create: `services/api/tests/test_db_models.py`

- [ ] **Step 2.1: Putuskan migrasi**
  - Untuk MVP cepat, pilih salah satu (implementasi harus konsisten di seluruh plan):
    - **Option A (Recommended):** Alembic untuk migrations.
    - **Option B:** simple SQL migration runner (folder `migrations/*.sql`).
  - Decision untuk eksekusi plan ini: **Option A (Alembic)**.

- [ ] **Step 2.2: Implement models + constraints**
  - Tables minimum (FSD):
    - `users` (id, email optional) untuk ownership
    - `api_keys` (id, user_id, key_hash, created_at) untuk auth API key
    - `products`
    - `inventory`
    - `campaigns` (+ `approval_status`)
    - `campaign_product_snapshots`
    - `campaign_steps` (+ `retryable`, `attempt`)
    - `campaign_assets`
  - Enum values:
    - `campaigns.status`: `draft|running|complete|failed`
    - `campaign_steps.status`: `queued|running|success|failed`
    - `campaigns.approval_status`: `none|pending_storyboard|approved_storyboard|rejected_storyboard`
  - Constraint idempotency:
    - `unique(campaign_id, step_key)` pada `campaign_steps`
    - `unique(campaign_id)` pada `campaign_product_snapshots`

- [ ] **Step 2.3: Seed demo user + API key**
  - Saat startup (dev mode), jika belum ada:
    - buat 1 user demo
    - buat 1 API key (print sekali di startup log boleh, tapi jangan pernah log key lagi setelah itu)

**Verification:**
- Jalankan migrasi ke DB local (docker compose).
- Jalankan tests model (create/read minimal).

---

## Task 3 — Product catalog + inventory endpoints
**Files:**
- Create: `services/api/app/routes/products.py`
- Create: `services/api/app/routes/inventory.py`
- Create: `services/api/tests/test_products_inventory.py`

- [ ] **Step 3.1: Implement endpoints sesuai FSD**
  - `GET /api/v1/products`
  - `POST /api/v1/products`
  - `GET /api/v1/products/{productId}`
  - `GET /api/v1/products/{productId}/inventory`
  - `PUT /api/v1/products/{productId}/inventory/{locationCode}`

- [ ] **Step 3.2: Ownership enforcement**
  - Semua query filter `user_id` dari API key.

**Verification:**
- `docker compose run --rm api pytest -q`
- Smoke test via Swagger `/docs`.

---

## Task 4 — Campaign CRUD + asset upload via MinIO signed URL
**Files:**
- Create: `services/api/app/providers/storage.py`
- Create: `services/api/app/routes/campaigns.py`
- Create: `services/api/app/routes/assets.py`
- Create: `services/api/tests/test_campaigns_assets.py`

- [ ] **Step 4.1: Campaign CRUD**
  - `GET /api/v1/campaigns`
  - `POST /api/v1/campaigns` (draft)
  - `GET /api/v1/campaigns/{campaignId}`
  - `PATCH /api/v1/campaigns/{campaignId}` (update draft only)

- [ ] **Step 4.2: Signed URL flow (1–5 images)**
  - Endpoint baru (usulan, konsisten dengan FSD “signed URL lebih ideal”):
    - `POST /api/v1/campaigns/{campaignId}/assets/product-images/presign`
      - Request: `{ "files": [{ "filename": "...", "content_type": "image/jpeg" }] }`
      - Response: `{ "items": [{ "asset_id": "uuid", "upload_url": "https://...", "storage_path": "..." }] }`
  - Setelah upload berhasil dari desktop:
    - `POST /api/v1/campaigns/{campaignId}/assets/product-images/commit`
      - Request: `{ "asset_ids": ["uuid", "..."] }`
      - Response: asset list + public_url (optional) / metadata.

- [ ] **Step 4.3: Enforce minimal 1 image sebelum generate**
  - Backend validasi di `/generate` (Task 6).

**Verification:**
- Unit test: presign menghasilkan URL, commit menandai asset ready.

---

## Task 5 — Agent contracts (Pydantic models) + prompt builders
**Files:**
- Create: `services/api/app/contracts/common.py`
- Create: `services/api/app/agents/product_analyst.py`
- Create: `services/api/app/agents/marketing_strategist.py`
- Create: `services/api/app/agents/copywriter.py`
- Create: `services/api/app/agents/creative_director.py` (storyboard)
- Create: `services/api/app/agents/video_director.py`
- Create: `services/api/app/agents/pixverse.py` (prompt+settings)
- Create: `services/api/app/agents/campaign_manager.py` (aggregator)
- Create: `services/api/app/providers/openai_client.py`
- Test: `services/api/tests/test_agents_contracts.py`

- [ ] **Step 5.1: Definisikan Pydantic output model per agent**
  - Field mengikuti schema PRD (minLength/minItems, enums, dsb).
  - Validation error harus menghasilkan error step `failed` yang `retryable=false` (karena prompt/output mismatch).

- [ ] **Step 5.2: Prompt builder per agent**
  - Input utama:
    - product snapshot (name, description, price, category, image URLs)
    - options (language, primary_goal, brand_tone, target_location)
    - context dari step sebelumnya (mis. strategist memakai output product analyst)
  - Output wajib JSON tanpa additionalProperties.

- [ ] **Step 5.3: OpenAI wrapper**
  - Method `generate_structured(model: BaseModel, prompt: str) -> model instance`
  - Timeout text step: 60–120 detik.
  - Jangan log API key / token.

**Verification:**
- Unit test: serialization & validation untuk sample payload (pakai contoh di PRD).

---

## Task 6 — Orchestrator workflow + progress API + retry
**Files:**
- Create: `services/api/app/orchestrator/state.py`
- Create: `services/api/app/orchestrator/runner.py`
- Create: `services/api/app/routes/workflow.py`
- Test: `services/api/tests/test_workflow_happy_path.py`
- Test: `services/api/tests/test_workflow_retry.py`

- [ ] **Step 6.1: Workflow state machine (7 step keys)**
  - Step keys fixed sesuai FSD: `product_analyst`, `marketing_strategist`, `copywriter`, `creative_director`, `video_director`, `pixverse`, `campaign_manager`.
  - Status per step: `queued|running|success|failed`
  - Simpan:
    - `output_json`, `started_at`, `finished_at`, `duration_ms`
    - `error_code`, `error_message`, `retryable`, `attempt`

- [ ] **Step 6.2: Endpoints workflow**
  - `POST /api/v1/campaigns/{campaignId}/generate`
    - Validasi: campaign milik user, status `draft`, minimal 1 image.
    - Buat snapshot `campaign_product_snapshots`.
    - Buat semua `campaign_steps` dengan status `queued` untuk step1 dan `queued` (atau `queued` tapi hanya step1 dieksekusi dulu; sisanya baru di-update saat chain).
    - Set `campaigns.status=running`, `approval_status=none`.
  - `GET /api/v1/campaigns/{campaignId}/progress`
    - Return sesuai FSD plus tambahan field:
      - `approval_status`
      - `action_required` opsional:
        - `{ "type": "storyboard_approval", "step_key": "creative_director" }` saat pending
  - `GET /api/v1/campaigns/{campaignId}/steps/{stepKey}` untuk dashboard.
  - `POST /api/v1/campaigns/{campaignId}/steps/{stepKey}/retry`

- [ ] **Step 6.3: Storyboard approval gate**
  - Setelah `creative_director` success:
    - Set `campaigns.approval_status=pending_storyboard`
    - Jangan lanjut ke `video_director` sampai approved.
  - Endpoint:
    - `POST /api/v1/campaigns/{campaignId}/storyboard/approve`
      - Set `approval_status=approved_storyboard` lalu queue `video_director`.
    - `POST /api/v1/campaigns/{campaignId}/storyboard/reject`
      - Set `approval_status=rejected_storyboard`
      - Set `campaigns.status=failed` (atau `draft` jika ingin edit & regenerate; pilih salah satu dan implement konsisten).
  - Decision: **Reject → status kembali `draft`** agar user bisa edit input lalu generate ulang tanpa buat campaign baru.

**Verification:**
- Test happy path sampai pending approval.
- Test approve melanjutkan workflow.
- Test reject mengembalikan ke draft dan membolehkan `PATCH /campaigns/{id}`.

---

## Task 7 — PixVerse CLI provider (async create → wait → download → extend)
**Files:**
- Create: `services/api/app/providers/pixverse_cli.py`
- Create: `services/api/app/orchestrator/steps/pixverse_step.py`
- Test: `services/api/tests/test_pixverse_cli_adapter.py` (mock subprocess)

- [ ] **Step 7.1: Definisikan kontrak PixVerse CLI**
  - Semua pemanggilan PixVerse via container helper (Node 20 + pixverse CLI terinstall) agar docker-first.
  - Install pixverse CLI dilakukan di Dockerfile image helper, bukan di host.
  - Auth tetap membutuhkan device flow; jalankan di container dan ikuti URL login yang diberikan CLI:
    - `docker compose run --rm pixverse pixverse auth login`
  - Pipeline default (berdasarkan README PixVerse CLI):
    - Create video (async): `pixverse create video --prompt "<prompt>" --aspect-ratio 9:16 --model v6 --quality 1080p --no-wait --json`
      - Parse JSON → `video_id`
    - Wait: `pixverse task wait <video_id> --json` (handle exit code 2 timeout, 3 auth, 4 credit, 5 failed)
    - Download: `pixverse asset download <video_id> --dest <tmp_dir> --json`
    - Extend hingga ≥30s:
      - `pixverse create extend --video <video_id> --no-wait --json` → dapat `video_id` baru
      - wait + download, ulang sampai durasi terpenuhi
  - Jika extend tidak tersedia/ gagal, fallback concat:
    - generate 2 video lagi dan concat via ffmpeg.

- [ ] **Step 7.2: Integrasi ke step `pixverse`**
  - Input step: output `Agent 6 — PixVerse` (prompt + settings).
  - Output step menyimpan:
    - `pixverse_prompt`, `video_settings`
    - `render_request` (provider, request_id/video_id, status)
    - asset video tersimpan ke MinIO dan direferensikan di `campaign_assets`.

- [ ] **Step 7.3: Validasi durasi video**
  - Setelah download, cek durasi via `ffprobe` (dependency: ffmpeg di PATH).
  - Simpan `duration_sec` ke metadata asset.

**Verification:**
- Unit test adapter dengan stub subprocess output JSON.
- Manual smoke: jalankan 1 campaign end-to-end di dev env dengan PixVerse account aktif.

---

## Task 8 — Final aggregation (Campaign Manager) + export
**Files:**
- Create: `services/api/app/orchestrator/steps/campaign_manager_step.py`
- Update: `services/api/app/routes/campaigns.py` (detail include package)
- Test: `services/api/tests/test_campaign_package.py`

- [ ] **Step 8.1: Compose `campaign_package`**
  - Setelah semua step success:
    - Build `campaign_package` JSON seperti contoh PRD:
      - summary, strategy, copy, creative, video (prompt + url + duration + aspect_ratio), publish_checklist
  - Simpan ke `campaign_steps` output untuk `campaign_manager`.
  - Set `campaigns.status=complete`.

- [ ] **Step 8.2: Export endpoints**
  - `GET /api/v1/campaigns/{id}/export/json` return file download (package).
  - `GET /api/v1/campaigns/{id}/export/video` redirect/signed url download video dari MinIO.

**Verification:**
- Test export JSON shape.

---

## Task 9 — Frontend app scaffolding (React Web + UI kit)
**Files:**
- Create: `apps/web/` (React project)
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/pages/Login.tsx`
- Create: `apps/web/src/pages/CampaignList.tsx`
- Create: `apps/web/src/pages/NewCampaign.tsx`
- Create: `apps/web/src/pages/CampaignDetail.tsx`
- Create: `apps/web/src/components/StepTimeline.tsx`
- Create: `apps/web/src/components/OutputPane.tsx`
- Create: `apps/web/src/components/ApprovalDialog.tsx`

- [ ] **Step 9.1: Scaffold Vite + React + TS**
  - Gunakan template Vite React TypeScript.
  - Setup Tailwind + shadcn/ui sesuai FSD.
  - Untuk docker-first dev/demo, jalankan Vite dev server di container `web`.

- [ ] **Step 9.2: Settings + API key**
  - Login sederhana: input `API Base URL` + `X-API-Key` (disimpan local storage).
  - Tombol “Test Connection” panggil `/health`.

- [ ] **Step 9.3: Campaign list + create form + upload signed URL**
  - Create campaign draft (POST `/campaigns`).
  - Presign upload URL:
    - call `/assets/product-images/presign`
    - upload file via `fetch(upload_url, { method: "PUT", body: file })`
    - commit `/commit`
  - Enable “Generate” hanya jika field mandatory + minimal 1 image tercommit.

- [ ] **Step 9.4: Campaign detail (timeline + live output + approval)**
  - Poll `/progress` tiap 1–2 detik.
  - Klik step di timeline menampilkan output step (formatted + raw JSON).
  - Saat `approval_status=pending_storyboard`, munculkan `ApprovalDialog`:
    - Approve → call `/storyboard/approve`
    - Reject → call `/storyboard/reject`

**Verification:**
- Jalankan UI via container `web` dan pastikan:
  - create campaign → upload images → generate → stop di approval → approve → lanjut ke video → complete.

---

## Task 10 — End-to-end acceptance & hardening
**Files:**
- Create: `scripts/dev-smoke.ps1` (Windows) atau `scripts/dev-smoke.sh`
- Update: `README.md`

- [ ] **Step 10.1: Acceptance checklist mapping**
  - Cocokkan dengan FSD “Acceptance Checklist (MVP Demo)”:
    - New campaign + upload
    - Workflow + progress
    - Output per step tersimpan
    - Video tampil & download
    - Retry PixVerse tanpa ulang step sebelumnya
    - Tambahan: storyboard approval gate berjalan

- [ ] **Step 10.2: Retry & failure modes**
  - OpenAI rate limit/timeouts: set `retryable=true` untuk error sementara.
  - PixVerse:
    - exit code 3 → auth error (minta user login ulang)
    - exit code 4 → credits limit
    - exit code 2 → timeout (munculkan retry)

- [ ] **Step 10.3: Docs**
  - `README.md` berisi:
    - Prereqs (Docker + Docker Compose, PixVerse account untuk device auth, ffmpeg jika tidak dibundle di container)
    - Cara menjalankan semua service via Docker Compose
    - Cara mendapatkan API key demo

---

## Verification (Overall)
- Backend:
  - `docker compose run --rm api pytest -q` (semua tests pass)
  - `GET /docs` dan semua endpoint utama bisa dicoba
- Frontend:
  - Campaign lifecycle end-to-end sesuai wireframe
- Performance (demo):
  - Progress polling stabil
  - Workflow recoverable: refresh UI tidak hilangkan progress (DB source of truth)
