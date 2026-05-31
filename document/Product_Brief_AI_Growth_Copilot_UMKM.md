# Product Brief — AI Growth Copilot (UMKM)

## 1) Ringkasan
AI Growth Copilot adalah aplikasi berbasis AI multi-agent yang membantu pelaku UMKM membuat paket kampanye pemasaran siap publikasi hanya dari data produk dan foto. Sistem bertindak sebagai “AI Marketing Department” yang menyusun insight produk, strategi kampanye, copy multi-channel, creative brief, storyboard, shotlist, prompt PixVerse, hingga video promosi, lalu merangkumnya menjadi campaign package.

Implementasi demo saat ini berjalan sebagai web app (React + Vite) yang terhubung ke backend FastAPI via API key.

---

## 2) Masalah yang Diselesaikan
Mayoritas UMKM mengalami hambatan:
- Tidak punya tim marketing dan sulit konsisten bikin konten
- Tidak memahami strategi pemasaran digital dan positioning
- Tidak punya kemampuan desain/video editing
- Waktu terbatas dan harus memakai banyak tools terpisah

AI Growth Copilot menyederhanakan proses menjadi satu alur terpadu: pilih/isi produk → generate campaign → dapat aset siap publikasi.

---

## 3) Target Pengguna
**Primary user:** pemilik UMKM (coffee shop, bakery, fashion lokal, skincare, F&B, toko online).

**Karakteristik:**
- Fokus operasional bisnis, butuh hasil cepat
- Keterbatasan skill marketing dan produksi konten
- Menginginkan output yang bisa langsung dipakai (bukan sekadar ide)

---

## 4) Value Proposition
Dari: “Punya produk tapi tidak tahu cara memasarkan dan bikin konten.”  
Menjadi: “Pilih/unggah produk → dapat kampanye lengkap (strategi + copy + video) dalam beberapa menit.”

Ekspansi untuk positioning subscription:
Menjadi: “Satu dashboard untuk launch: generate konten → susun jadwal multi-channel → pantau engagement → iterasi (berbasis data & stok).”

---

## 5) Solusi & Cara Kerja (High Level)
1. User memilih produk dari database inventory atau input manual + upload foto.
2. Sistem membuat snapshot data produk + konteks stok (data only) untuk memastikan output stabil dan tidak tercampur dengan inventory operasional.
3. Multi-agent workflow berjalan berurutan:
   - Product Analyst → Marketing Strategist → Copywriter → Creative Director → Video Director → PixVerse → Campaign Manager
4. Hasil muncul bertahap di dashboard, dapat langsung di-copy/download.

---

## 6) Fitur MVP
- **Product & Inventory (Data Only):** simpan master produk + stok; campaign mengambil snapshot saat generate.
- **Generate Campaign End-to-End:** menghasilkan strategi + copy + storyboard + shotlist + prompt + video.
- **Workflow Visualization:** status setiap agent (queued/running/success/failed) dan retry per step.
- **Storyboard Approval Gate:** workflow berhenti setelah storyboard untuk approve/reject sebelum lanjut ke produksi video.
- **Campaign Dashboard:** tampilan output terstruktur per section + export JSON.
- **Asset Management:** simpan foto dan video di MinIO (S3); download/copy link.

## 6.1 Ekspansi “Launch Dashboard” (Subscription-ready)
- **Integrations Hub:** connect akun Instagram, TikTok, Facebook, WhatsApp Business (official API).
- **Content Calendar (Scheduling Draft):** buat & jadwalkan draft per channel (tanpa auto-posting di v1) + reminder + checklist publish manual.
- **Analytics Dashboard:** ringkas metrik performa per channel dan per campaign; dukung input manual post URL/ID bila API terbatas.
- **Marketplace Manual Import:** import CSV produk/stok/order ringkas + mapping SKU; dipakai untuk CTA stock-aware dan rekomendasi offer.
- **Offer Builder:** generator varian offer (mekanik promo, headline, CTA, guardrails) yang langsung bisa dijadikan draft kalender.

---

## 7) Diferensiasi Utama
- Multi-agent kolaboratif (bukan single prompt).
- Output terstruktur dan siap pakai lintas channel.
- Ada “production layer” untuk video (PixVerse), bukan hanya ide konten.
- Snapshot data produk+stok agar data operasional inventory tidak bercampur dengan output AI.

---

## 8) Definisi Sukses (Hackathon)
- Waktu generate campaign median < 5 menit (termasuk video).
- Durasi video ≥ 30 detik.
- ≤ 5 klik dari input sampai hasil utama terlihat.
- Completion rate demo tinggi (≥ 90% campaign selesai tanpa error fatal).

---

## 9) Tech Stack (Target)
- **Frontend (Demo saat ini):** Web app React + TypeScript + Vite + Tailwind
- **Frontend (Roadmap):** Electron wrapper untuk offline-first dan integrasi OS (opsional)
- **Backend:** Python (FastAPI) + API key auth (`X-API-Key`)
- **Database:** PostgreSQL
- **Object Storage:** MinIO (S3)
- **AI Text:** OpenAI API (output JSON terstruktur)
- **Video:** PixVerse API
- **Infra Dev:** Docker Compose (API + DB + MinIO)

---

## 10) Roadmap (Ringkas)
- v1 Launch Dashboard: integrations + calendar drafts + analytics baseline + marketplace CSV import + offer builder.
- v2: auto-posting (per platform yang memungkinkan) + inbox-lite (template + assisted replies) untuk DM/WhatsApp.
- v3: closed-loop optimization (generate → jadwalkan → ukur → rekomendasi iterasi) berbasis performance + inventory + margin.
