# AI Growth Copilot (UMKM) — MVP

Spec:
- [PRD_Teknis_AI_Growth_Copilot_UMKM.md](file:///d:/2026/Project/productivity-trae-hackaton/document/PRD_Teknis_AI_Growth_Copilot_UMKM.md)
- [FSD_AI_Growth_Copilot_UMKM.md](file:///d:/2026/Project/productivity-trae-hackaton/document/FSD_AI_Growth_Copilot_UMKM.md)
- [Wireframe_Electron_AI_Growth_Copilot_UMKM.md](file:///d:/2026/Project/productivity-trae-hackaton/document/Wireframe_Electron_AI_Growth_Copilot_UMKM.md)

Monorepo:
- `infra/`: Docker Compose (Postgres + MinIO + API + Web)
- `services/api/`: FastAPI backend
- `apps/web/`: React web (Vite + TypeScript + Tailwind)

## Quick Start (Docker)

1. Buat file env:
   - copy `infra/.env.example` menjadi `infra/.env`
   - isi minimal:
     - `OPENAI_API_KEY` (wajib untuk agent AI)
     - `OPENAI_BASE_URL` (opsional; isi `https://ai.sumopod.com` untuk SumoPod)
     - `OPENAI_MODEL` (opsional; contoh: `kimi-k2.6`)
     - `DEMO_API_KEY` (API key untuk login via web; default `dev`)
     - `PIXVERSE_WORKSPACE_ID` (wajib hanya jika ingin generate video via PixVerse)
2. Jalankan semua service dari folder `infra/`:

   ```bash
   docker compose up --build
   ```

3. Buka:
   - Web: `http://localhost:5173`
   - API docs: `http://localhost:8000/docs`
   - MinIO console: `http://localhost:9001`

## PixVerse Auth (di container API)

Konfigurasi PixVerse CLI disimpan di volume `pixverse_config` supaya tidak hilang saat container restart.

```bash
docker compose exec api pixverse auth login
```

## Cara Pakai Web

1. Buka `Settings`, isi:
   - API Base URL: `http://localhost:8000`
   - API Key: isi sesuai `DEMO_API_KEY` di `infra/.env` (default `dev`)
2. Buat campaign baru:
   - upload minimal 1 product image (flow presign PUT → commit)
   - klik `Generate`
3. Saat step storyboard (`creative_director`) selesai, lakukan `Approve` untuk lanjut ke video; `Reject` untuk reset campaign ke draft.

## Smoke Test (Opsional)

```powershell
.\scripts\smoke.ps1 -ApiBaseUrl "http://localhost:8000" -ApiKey "dev"
```
