# Wireframe Detail (Electron Desktop) — AI Growth Copilot (UMKM)

Dokumen ini berisi wireframe detail (low–mid fidelity) untuk semua halaman MVP Electron Desktop App, termasuk state: empty/loading/error dan komponen reusable.

Konvensi:
- `[Button]` = tombol
- `( )` = radio
- `[ ]` = input / checkbox
- `⋯` = placeholder
- `↑/↓` = sort
- `⌘C` = copy

---

## 0) App Shell (Frame Desktop)
Semua halaman (kecuali login) memakai app shell berikut:

```text
+--------------------------------------------------------------------------------------------------+
|  AI Growth Copilot                                                                 [—] [□] [X]   |
|--------------------------------------------------------------------------------------------------|
|  Sidebar                         |  Top Bar                                                     |
|----------------------------------+----------------------------------------------------------------|
|  • Campaigns                     |  Breadcrumb: Campaigns / …                                     |
|  • New Campaign                  |  Search (contextual): [ Search campaigns… ]        [Profile ⌄] |
|  • Assets                        |                                                                |
|  • Settings                      |                                                                |
|----------------------------------+----------------------------------------------------------------|
|  Workspace/Account               |  Main Content Area                                             |
|  user@email.com                  |                                                                |
+--------------------------------------------------------------------------------------------------+
```

**Sidebar behavior**
- `Campaigns`: list & filtering
- `New Campaign`: shortcut ke create
- `Assets`: library semua asset (opsional MVP, tapi enak untuk demo)
- `Settings`: endpoint URL, theme, akun, token

---

## 1) Halaman: Login
Tujuan: user masuk dan menyimpan session token.

### 1.1 Default
```text
+----------------------------------------------------------------------------------+
| AI Growth Copilot                                                                |
|----------------------------------------------------------------------------------|
|  Welcome back                                                                    |
|  Email          [____________________________]                                   |
|  Password       [____________________________]  (👁)                             |
|                                                                                  |
|  [ Sign In ]                                                                     |
|                                                                                  |
|  ———————————————————————                                                         |
|  Server Endpoint (Advanced)                                                      |
|  API Base URL   [ http://localhost:8000 ]                                        |
|  [ Test Connection ]                                                             |
|                                                                                  |
|  Need an account?  [Create one]                                                  |
+----------------------------------------------------------------------------------+
```

### 1.2 States
- Loading: tombol disabled + spinner
- Error: banner di atas form “Invalid credentials” / “Cannot reach server”
- Test Connection success: badge hijau “OK” + latency ms

---

## 2) Halaman: Campaigns (List)
Tujuan: melihat semua campaign, status, cepat buka, cepat buat.

### 2.1 Default (ada data)
```text
+--------------------------------------------------------------------------------------------------+
| Campaigns                                                                                         |
|--------------------------------------------------------------------------------------------------|
|  Filter:  Status [ All ⌄ ]   Goal [ All ⌄ ]   Sort [ Updated ↓ ⌄ ]     [ + New Campaign ]       |
|--------------------------------------------------------------------------------------------------|
|  [Search campaigns…_____________________________________________]                                 |
|--------------------------------------------------------------------------------------------------|
|  Cards/Grid                                                                                       |
|  +------------------------------+   +------------------------------+   +------------------------+|
|  | Iced Caramel Latte           |   | Brownies Box                 |   | Skincare Serum        ||
|  | Status: RUNNING  (42%)       |   | Status: COMPLETE             |   | Status: FAILED        ||
|  | Updated: 2m ago              |   | Updated: yesterday           |   | Updated: 10m ago      ||
|  | Steps: 3/7 ✓                 |   | Video: ✓ Assets: ✓           |   | PixVerse: failed      ||
|  | [Open]      [Duplicate]      |   | [Open] [Export JSON]         |   | [Open] [Retry]        ||
|  +------------------------------+   +------------------------------+   +------------------------+|
|--------------------------------------------------------------------------------------------------|
|  Bottom bar:  Selected: 0                                         [Export Selected] (disabled)   |
+--------------------------------------------------------------------------------------------------+
```

### 2.2 Empty State
```text
+--------------------------------------------------------------------------------------------------+
| Campaigns                                                                                         |
|--------------------------------------------------------------------------------------------------|
|  (Illustration)                                                                                   |
|  Belum ada campaign. Upload produk pertama kamu dan biarkan AI bikin paket promosi lengkap.      |
|                                                                                                  |
|  [ + New Campaign ]                                                                              |
+--------------------------------------------------------------------------------------------------+
```

### 2.3 Card interactions
- Hover: tampil quick actions (Open / Duplicate / Export)
- Right-click: context menu (Open, Rename, Delete, Export)

---

## 3) Halaman: New Campaign (Create)
Tujuan: input produk, upload foto, set opsi tone/goal, lalu generate.

### 3.1 Layout
```text
+--------------------------------------------------------------------------------------------------+
| New Campaign                                                                                      |
|--------------------------------------------------------------------------------------------------|
|  Left: Form                                                | Right: Preview & Tips               |
|------------------------------------------------------------+--------------------------------------|
|  Product Info                                              |  Preview Card                        |
|  Name        [__________________________]                  |  +-------------------------------+   |
|  Category    [ Coffee ⌄ ]                                  |  | (thumbnail)                    |   |
|  Price (IDR) [ 25000 ]                                     |  | Iced Caramel Latte             |   |
|  Description                                               |  | Rp25.000                       |   |
|  [___________________________________________]             |  | “Kopi premium …”               |   |
|  [___________________________________________]             |  +-------------------------------+   |
|                                                            |                                      |
|  Campaign Options (optional)                                |  Tips                               |
|  Goal        [ conversion ⌄ ]                               |  - Foto terang, close-up produk     |
|  Brand tone  [ hangat, premium, friendly ]                  |  - Deskripsi singkat + jelas        |
|  Location    [ Jakarta ]                                    |  - Harga membantu CTA & offer       |
|                                                            |                                      |
|  Product Images (1–5)                                       |                                      |
|  [ + Add Images ]   [Remove All]                            |                                      |
|  [thumb] [thumb] [thumb]                                   |                                      |
|                                                            |                                      |
|  [ Save Draft ]                         [ Generate Campaign ]                                      |
+--------------------------------------------------------------------------------------------------+
```

### 3.2 Validasi
- Generate disabled sampai minimal: name, description, category, price, 1 image
- Error inline per field + summary banner di atas

### 3.3 Loading upload
- Thumbnail menampilkan progress ring pada tiap image
- Jika upload gagal: tombol retry per image

---

## 4) Halaman: Campaign Detail (Workflow + Dashboard)
Tujuan: menampilkan progres multi-agent, hasil bertahap, kontrol retry, dan akses aset.

### 4.1 Layout utama (3 panel)
```text
+--------------------------------------------------------------------------------------------------+
| Campaign: Iced Caramel Latte                                 Status: RUNNING      [Share ⌄]     |
|--------------------------------------------------------------------------------------------------|
| Left: Step Timeline                 | Middle: Live Output                     | Right: Controls |
|-------------------------------------+-----------------------------------------+----------------|
|  1 ✓ Product Analyst                |  Output: Product Insight                |  Product       |
|    00:08                            |  USP                                   |  - Rp25.000     |
|    “USP: creamy…”                   |  • Rasa caramel seimbang               |  - Coffee       |
|                                     |  • Espresso premium                    |  [Edit Draft]   |
|  2 ✓ Marketing Strategist           |  Target                                |                |
|    00:09                            |  • 18–34, pekerja & mahasiswa          |  Actions       |
|    “Offer: 20%…”                    |  Positioning                           |  [Stop]        |
|                                     |  “Kopi dingin caramel…”                |  [Retry Step]   |
|  3 ✓ Copywriter                     |                                         |  (disabled)     |
|    00:07                            |  Tabs: [IG] [TikTok] [FB] [WA]         |                |
|    “Caption ready”                  |  IG caption…                           |  Progress      |
|                                     |  [⌘C Copy]                             |  Steps: 3/7     |
|  4 ⟳ Creative Director (running)    |                                         |  ETA: ~2m       |
|    “Menyusun storyboard…”           |  Live updates…                          |                |
|  5 • Video Director (queued)        |                                         |  Logs          |
|  6 • PixVerse (queued)              |                                         |  last: 10:31:02 |
|  7 • Campaign Manager (queued)      |                                         |  [View logs]    |
|-------------------------------------+-----------------------------------------+----------------|
| Bottom tabs: [Dashboard] [Assets] [JSON] [Activity]                                               |
+--------------------------------------------------------------------------------------------------+
```

### 4.2 Behavior penting
- Klik step di timeline → middle panel menampilkan output step itu (read-only).
- Saat running, middle panel auto-pin ke step aktif (ada toggle “Follow running step”).
- Setelah success, tampilkan 1–2 baris highlight di step card.

### 4.3 PixVerse sub-state (progress panjang)
Saat step PixVerse aktif, middle panel berubah:
```text
PixVerse Rendering
Status: Rendering (polling every 8s)        Last update: 10:33:10
[███████████░░░░░░░░░░]  58% (pseudo)

Prompt (read-only) [Copy]
“Vertical 9:16 premium coffee ad video…”

[ Retry Render ]   [ Use Prompt Only ]   [ Cancel ]
```

### 4.4 Complete state (dashboard)
Saat campaign complete, middle panel default ke ringkasan package:
```text
Campaign Package
- Strategy: Campaign name, objective, offer, plan
- Copy: tabs + copy buttons
- Creative: storyboard table
- Video: player + download
- Publish checklist: checklist items
[ Export JSON ]  [ Download Video ]  [ Duplicate Campaign ]
```

### 4.5 Error state (step failed)
```text
Banner (red):
PixVerse failed: timeout while polling provider. (retryable)
[ Retry PixVerse ]  [ View Details ]  [ Back to Dashboard ]
```

---

## 5) Tab: Assets (di dalam Campaign Detail)
Tujuan: tempat khusus untuk file dan link.

### 5.1 Assets tab
```text
+--------------------------------------------------------------------------------------------------+
| Assets                                                                                            |
|--------------------------------------------------------------------------------------------------|
| Product Images                                                                                     |
|  [thumb] [thumb] [thumb]      [Download selected] [Copy links]                                    |
|--------------------------------------------------------------------------------------------------|
| Video                                                                                              |
|  [▶ Player 9:16]                                                                                   |
|  Duration: 30s   Size: 18MB   Format: mp4                                                          |
|  [Download MP4]  [Copy URL]  [Open in folder]                                                      |
|--------------------------------------------------------------------------------------------------|
| Generated Files                                                                                   |
|  campaign_package.json     [Download]                                                              |
|  pixverse_prompt.txt       [Download]                                                              |
+--------------------------------------------------------------------------------------------------+
```

---

## 6) Halaman: Assets Library (Global)
Tujuan: melihat semua asset lintas campaign (memudahkan demo dan reuse).

### 6.1 Default
```text
+--------------------------------------------------------------------------------------------------+
| Assets                                                                                             |
|--------------------------------------------------------------------------------------------------|
|  Filter: Type [ All ⌄ ]   Campaign [ All ⌄ ]   Sort [ Newest ↓ ⌄ ]                                |
|  [Search assets…____________________________________________]                                     |
|--------------------------------------------------------------------------------------------------|
|  Grid                                                                                              |
|  +-------------------+ +-------------------+ +-------------------+                                 |
|  | IMG  latte-1.jpg   | | VIDEO latte.mp4   | | JSON package.json  |                                 |
|  | Campaign: Latte    | | Campaign: Latte   | | Campaign: Brownies |                                 |
|  | [Open] [Copy URL]  | | [Play] [Download] | | [Download]         |                                 |
|  +-------------------+ +-------------------+ +-------------------+                                 |
+--------------------------------------------------------------------------------------------------+
```

### 6.2 Empty
- pesan “Belum ada asset, generate campaign dulu.”

---

## 7) Halaman: Settings
Tujuan: konfigurasi endpoint, storage, theme, dan tools untuk demo.

### 7.1 Default
```text
+--------------------------------------------------------------------------------------------------+
| Settings                                                                                           |
|--------------------------------------------------------------------------------------------------|
|  Connection                                                                                       |
|  API Base URL           [ http://localhost:8000 ]         [ Test ]                                 |
|                                                                                                   |
|  Storage (MinIO / S3)                                                                             |
|  Endpoint              [ http://localhost:9000 ]                                                   |
|  Bucket                [ aigrowthcopilot ]                                                         |
|  Access Key            [ ************* ]                                                           |
|  Secret Key            [ ************* ]                                                           |
|  [ Validate Storage ]                                                                             |
|                                                                                                   |
|  Appearance                                                                                        |
|  Theme: (•) Dark  ( ) Light   Accent: [ Caramel ⌄ ]                                                |
|                                                                                                   |
|  Developer                                                                                        |
|  Polling interval (ms) [ 1500 ]    PixVerse poll (s) [ 8 ]                                         |
|  [ Clear cache ]  [ Export logs ]                                                                  |
+--------------------------------------------------------------------------------------------------+
```

---

## 8) Halaman: Profile / Account
Tujuan: info akun, logout, token status.

```text
+--------------------------------------------------------------------------------------------------+
| Profile                                                                                            |
|--------------------------------------------------------------------------------------------------|
|  user@email.com                                                                                    |
|  Role: User                                                                                        |
|  Session: active (expires in 2h 10m)                                                               |
|                                                                                                   |
|  [ Change password ]                                                                               |
|  [ Sign out ]                                                                                      |
+--------------------------------------------------------------------------------------------------+
```

---

## 9) Reusable Components (Spec)

### 9.1 `StepTimeline`
- Item: step name, status chip, duration, highlight line, last output teaser.
- Interaction: click selects step, keyboard ↑/↓ navigate.

### 9.2 `OutputPane`
- Modes: `preview` (formatted), `raw` (JSON), `diff` (opsional untuk retry).
- Actions: copy section, export section.

### 9.3 `AssetViewer`
- Image grid + selection
- Video player + download/copy/open
- File list (json/txt) + download

### 9.4 `ErrorBanner + RecoveryActions`
- Menampilkan error ringkas + tombol tindakan utama (Retry, View details).
- “Details” membuka drawer log.

### 9.5 `ActivityLogDrawer`
- List event: step started/finished, provider calls, polling updates.
- Filter: errors only / all.

---

## 10) Design Notes (biar terasa premium)
- Timeline harus “terasa nyata”: tampilkan micro-status (mis. “Writing captions…”, “Rendering…”, “Uploading…”).
- Hasil muncul bertahap: user sudah bisa copy caption walau video belum selesai.
- Sediakan “Quick View” vs “Pro View” (toggle) untuk demo teknis (JSON + logs).

