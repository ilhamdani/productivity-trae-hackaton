# Unbound Creativity with TRAE SOLO — Submission Template

Please keep the online document's permissions open to everyone so that the judges can review it.

## 1. Group/Individual Information
Fill in according to the actual team situation.  
For a 1-person team, there’s no need to fill in multiple member information.  
(Max 3 members)

| Name | Profession/Role | Division of Work |
|---|---|---|
| Team Member 1 |  |  |
| Team Member 2 |  |  |
| Team Member 3 |  |  |

---

## 2. Track
Just pick one

- [ ] Video Generation
- [ ] Productivity Enhancement

---

## 3. Project Information

**Project Title**  
AI Growth Copilot for SMEs (UMKM)

**Project Summary**  
AI Growth Copilot adalah aplikasi berbasis AI Multi-Agent yang bertindak sebagai “AI Marketing Department” untuk UMKM. Pengguna memilih/unggah data produk dan foto, lalu sistem menghasilkan paket kampanye lengkap: product insight, target audience, strategi pemasaran, copy multi-channel, storyboard, shotlist, prompt PixVerse, hingga video promosi 30–45 detik, dalam satu workflow end-to-end.

**Target Audience**  
Pemilik UMKM tanpa tim marketing (coffee shop, bakery, fashion lokal, skincare, F&B, toko online) yang butuh output pemasaran siap publikasi dengan cepat.

**Problem Being Solved**  
UMKM kesulitan membuat kampanye marketing konsisten karena keterbatasan waktu, skill, dan biaya. Mereka harus memakai banyak tools terpisah (ide, desain, copy, editing, publishing) yang memakan waktu dan tidak terintegrasi. AI Growth Copilot menyatukan proses itu dalam satu alur otomatis dengan hasil terstruktur dan siap dipakai.

---

## 4. Project Showcase

**Demo Flow (Suggested)**
1. Login → Create Campaign
2. Pilih produk dari catalog/inventory atau input manual + upload foto
3. Klik “Generate Campaign”
4. Tampilkan workflow multi-agent real-time (step-by-step)
5. Preview output bertahap (strategy, captions, storyboard, shotlist)
6. PixVerse render video → tampilkan video final
7. Export campaign package (JSON) + download video + copy captions/prompt

**Key Features to Highlight**
- Multi-Agent collaboration (Product Analyst → Strategist → Copywriter → Creative Director → Video Director → PixVerse → Campaign Manager)
- Workflow visualization + retry per step
- Video generation via PixVerse (≥ 30s)
- Inventory “data-only” + snapshot agar tidak bercampur dengan output AI
- Campaign package siap publikasi lintas channel

**Tech Stack**
- Electron (Desktop) + React + TypeScript
- Backend: Python (FastAPI) + PostgreSQL
- Object Storage: MinIO (S3)
- AI: OpenAI API
- Video: PixVerse API
- Docker Compose untuk dev services
