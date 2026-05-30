# PRD Teknis — AI Growth Copilot for SMEs (UMKM)

## 1) Ruang Lingkup MVP
**Input**
- Product: `name, description, price, category, 1-5 images`
- Opsional: `brand_tone, target_location, primary_goal`

**Output (Campaign Package)**
- Product insight (USP, positioning, target audience)
- Campaign strategy (objective, offer, channels, pillars)
- Copy multi-channel (IG/TikTok/FB/WA, CTA, hashtags)
- Creative brief + storyboard
- Shotlist + arahan produksi
- PixVerse prompt + settings
- Video promosi (≥30 detik) + asset link
- Paket publikasi (checklist, rekomendasi jadwal)

**Kriteria sukses**
- End-to-end < 5 menit (median demo)
- Durasi video ≥ 30 detik
- ≤ 5 klik sampai hasil utama tampil

---

## 2) Arsitektur Eksekusi (Teknis)
**Orchestrator**
- Menjalankan step agent berurutan (1→7)
- Menyimpan status step: `queued | running | success | failed`
- Menyimpan output JSON per step + durasi + error ringkas
- Mendukung retry per step (idempotent)

**AI Provider**
- OpenAI API (text) dengan output terstruktur JSON mengikuti schema.

**Video Provider**
- PixVerse API:
  - create generation → `request_id`
  - poll status → `completed/failed`
  - simpan video hasil ke storage

**Penyimpanan**
- PostgreSQL: campaign + step output
- MinIO (S3 Object Storage): foto produk + video hasil

---

## 3) Data Model Minimum (DB)
**campaigns**
- `id, user_id, product_name, product_description, price, category, product_image_urls(jsonb)`
- `status(draft|running|complete|failed)`, `created_at, updated_at`

**campaign_steps**
- `id, campaign_id, step_key, status, started_at, finished_at, duration_ms`
- `output_json(jsonb)`, `error_message(text)`

**campaign_assets**
- `id, campaign_id, asset_type(product_image|pixverse_video)`
- `storage_path, public_url(optional), metadata(jsonb)`

---

## 4) Kontrak Orchestrator (API/Server Actions)
### 4.1 Request: Start Generation
```json
{
  "campaign_id": "uuid",
  "options": {
    "language": "id",
    "primary_goal": "conversion",
    "brand_tone": "hangat, premium, friendly",
    "target_location": "Jakarta"
  }
}
```

### 4.2 Response: Progress Snapshot
```json
{
  "campaign_id": "uuid",
  "campaign_status": "running",
  "current_step_key": "copywriter",
  "steps": [
    { "step_key": "product_analyst", "status": "success", "duration_ms": 8420 },
    { "step_key": "marketing_strategist", "status": "success", "duration_ms": 9100 },
    { "step_key": "copywriter", "status": "running" },
    { "step_key": "creative_director", "status": "queued" },
    { "step_key": "video_director", "status": "queued" },
    { "step_key": "pixverse", "status": "queued" },
    { "step_key": "campaign_manager", "status": "queued" }
  ],
  "error": null
}
```

### 4.3 Response: Completed
```json
{
  "campaign_id": "uuid",
  "campaign_status": "complete",
  "package_ref": {
    "campaign_package_step_id": "uuid",
    "video_asset_url": "https://..."
  }
}
```

---

# JSON Schema per Agent (Draft v1)

Catatan: schema di bawah memakai gaya JSON Schema Draft 2020-12. Semua field `additionalProperties: false` agar output konsisten.

## A0) Common Types (dipakai lintas agent)
### Money
```json
{
  "$id": "https://aigrowthcopilot/schema/common/money.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Money",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "currency": { "type": "string", "enum": ["IDR"] },
    "amount": { "type": "number", "minimum": 0 }
  },
  "required": ["currency", "amount"]
}
```

### Audience
```json
{
  "$id": "https://aigrowthcopilot/schema/common/audience.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Audience",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "demographics": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "age_range": { "type": "string" },
        "gender": { "type": "string" },
        "location": { "type": "string" },
        "income_level": { "type": "string" },
        "occupation": { "type": "string" }
      },
      "required": ["age_range", "location"]
    },
    "psychographics": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "interests": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "values": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "behaviors": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      },
      "required": ["interests"]
    },
    "pain_points": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
  },
  "required": ["demographics", "psychographics", "pain_points"]
}
```

---

## Agent 1 — Product Analyst
### Output Schema
```json
{
  "$id": "https://aigrowthcopilot/schema/agent/product_analyst.output.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ProductAnalystOutput",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "product_summary": { "type": "string", "minLength": 20 },
    "usp": { "type": "array", "items": { "type": "string" }, "minItems": 1, "maxItems": 5 },
    "key_benefits": { "type": "array", "items": { "type": "string" }, "minItems": 2, "maxItems": 6 },
    "positioning_statement": { "type": "string", "minLength": 20 },
    "target_audience": { "$ref": "https://aigrowthcopilot/schema/common/audience.json" },
    "objections_and_answers": {
      "type": "array",
      "minItems": 1,
      "maxItems": 5,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "objection": { "type": "string" },
          "response": { "type": "string" }
        },
        "required": ["objection", "response"]
      }
    }
  },
  "required": [
    "product_summary",
    "usp",
    "key_benefits",
    "positioning_statement",
    "target_audience",
    "objections_and_answers"
  ]
}
```

### Contract Response Contoh
```json
{
  "product_summary": "Iced Caramel Latte adalah minuman kopi dingin dengan espresso premium, susu segar, dan sirup caramel yang seimbang—cocok untuk pelanggan yang ingin kopi manis dan smooth.",
  "usp": [
    "Rasa caramel seimbang, tidak enek",
    "Espresso premium dengan aftertaste clean",
    "Susu segar membuat tekstur creamy"
  ],
  "key_benefits": [
    "Mudah dinikmati untuk pemula kopi",
    "Memberi energi tanpa rasa terlalu pahit",
    "Cocok untuk cuaca panas dan on-the-go"
  ],
  "positioning_statement": "Kopi dingin caramel yang creamy dan premium untuk pelanggan sibuk yang ingin rasa manis yang elegan, bukan sekadar kopi manis biasa.",
  "target_audience": {
    "demographics": {
      "age_range": "18-34",
      "gender": "Semua",
      "location": "Jakarta dan kota besar",
      "income_level": "Menengah",
      "occupation": "Mahasiswa & pekerja kantoran"
    },
    "psychographics": {
      "interests": ["kopi", "cafe-hopping", "kuliner", "konten lifestyle"],
      "values": ["kualitas", "praktis", "tampilan estetik"],
      "behaviors": ["sering beli minuman takeaway", "aktif di Instagram/TikTok", "suka promo bundling"]
    },
    "pain_points": ["kopi pahit tidak cocok", "minuman manis sering terlalu enek", "butuh minuman praktis saat sibuk"]
  },
  "objections_and_answers": [
    { "objection": "Terlalu manis?", "response": "Rasa caramel dibuat seimbang; bisa request less sugar." },
    { "objection": "Harganya worth it?", "response": "Pakai espresso premium + susu segar; kualitas rasa konsisten setiap gelas." }
  ]
}
```

---

## Agent 2 — Marketing Strategist
### Output Schema
```json
{
  "$id": "https://aigrowthcopilot/schema/agent/marketing_strategist.output.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "MarketingStrategistOutput",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "campaign_name": { "type": "string", "minLength": 3 },
    "objective": { "type": "string", "enum": ["awareness", "conversion", "retention"] },
    "target_audience_refinement": { "$ref": "https://aigrowthcopilot/schema/common/audience.json" },
    "offer": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "headline": { "type": "string" },
        "mechanic": { "type": "string", "enum": ["discount", "bundle", "bogo", "free_addon", "limited_drop", "loyalty_points"] },
        "details": { "type": "string" },
        "validity_days": { "type": "integer", "minimum": 1, "maximum": 30 }
      },
      "required": ["headline", "mechanic", "details", "validity_days"]
    },
    "channels": {
      "type": "array",
      "items": { "type": "string", "enum": ["instagram", "tiktok", "facebook", "whatsapp"] },
      "minItems": 1
    },
    "messaging_pillars": { "type": "array", "items": { "type": "string" }, "minItems": 2, "maxItems": 5 },
    "content_angles": { "type": "array", "items": { "type": "string" }, "minItems": 3, "maxItems": 8 },
    "publishing_plan": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "duration_days": { "type": "integer", "minimum": 3, "maximum": 14 },
        "posts_per_day": { "type": "integer", "minimum": 1, "maximum": 5 },
        "best_time_windows": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      },
      "required": ["duration_days", "posts_per_day", "best_time_windows"]
    },
    "success_metrics": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "primary": { "type": "string" },
        "secondary": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["primary", "secondary"]
    }
  },
  "required": [
    "campaign_name",
    "objective",
    "target_audience_refinement",
    "offer",
    "channels",
    "messaging_pillars",
    "content_angles",
    "publishing_plan",
    "success_metrics"
  ]
}
```

### Contract Response Contoh
```json
{
  "campaign_name": "Caramel Chill Break",
  "objective": "conversion",
  "target_audience_refinement": {
    "demographics": { "age_range": "18-34", "gender": "Semua", "location": "Jakarta", "income_level": "Menengah", "occupation": "Karyawan & mahasiswa" },
    "psychographics": { "interests": ["kopi", "lifestyle", "promo hemat"], "values": ["praktis", "estetik"], "behaviors": ["order takeaway", "aktif IG/TikTok"] },
    "pain_points": ["butuh boost energi cepat", "ingin minuman dingin yang enak tanpa terlalu manis"]
  },
  "offer": {
    "headline": "Diskon 20% jam 14.00–17.00",
    "mechanic": "discount",
    "details": "Iced Caramel Latte diskon 20% untuk pembelian langsung / pickup.",
    "validity_days": 7
  },
  "channels": ["instagram", "tiktok", "whatsapp"],
  "messaging_pillars": ["Creamy tapi seimbang", "Premium espresso, tetap santai", "Perfect untuk break siang"],
  "content_angles": ["POV break siang", "Before/after capek → segar", "ASMR pour & ice", "Close-up creamy swirl", "Promo happy hour"],
  "publishing_plan": { "duration_days": 7, "posts_per_day": 2, "best_time_windows": ["11:30-13:00", "15:00-17:30"] },
  "success_metrics": { "primary": "Jumlah transaksi Iced Caramel Latte", "secondary": ["CTR link menu", "DM/WA masuk", "View rate video"] }
}
```

---

## Agent 3 — Copywriter Agent
### Output Schema
```json
{
  "$id": "https://aigrowthcopilot/schema/agent/copywriter.output.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CopywriterOutput",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "brand_voice": { "type": "string" },
    "instagram_caption": { "type": "string", "minLength": 50 },
    "tiktok_caption": { "type": "string", "minLength": 20 },
    "facebook_post": { "type": "string", "minLength": 50 },
    "whatsapp_broadcast": { "type": "string", "minLength": 50 },
    "cta_variants": { "type": "array", "items": { "type": "string" }, "minItems": 3, "maxItems": 7 },
    "hashtags": { "type": "array", "items": { "type": "string", "pattern": "^#\\S+$" }, "minItems": 8, "maxItems": 20 },
    "disclaimer": { "type": "string" }
  },
  "required": [
    "brand_voice",
    "instagram_caption",
    "tiktok_caption",
    "facebook_post",
    "whatsapp_broadcast",
    "cta_variants",
    "hashtags",
    "disclaimer"
  ]
}
```

### Contract Response Contoh
```json
{
  "brand_voice": "Hangat, premium, friendly, ringan.",
  "instagram_caption": "Lagi butuh break yang manisnya pas? Kenalan sama Iced Caramel Latte—creamy, dingin, dan espresso-nya premium. Cocok buat nemenin kerja atau jalan sore. Minggu ini ada Diskon 20% jam 14.00–17.00. Yuk mampir atau pickup sekarang!",
  "tiktok_caption": "Creamy caramel yang manisnya pas. Diskon 20% jam 14-17!",
  "facebook_post": "Iced Caramel Latte siap jadi penyelamat break siang kamu: espresso premium + susu segar + caramel seimbang. Promo Diskon 20% setiap 14.00–17.00 (7 hari). Order sekarang untuk pickup!",
  "whatsapp_broadcast": "Hai! Minggu ini ada promo Iced Caramel Latte: Diskon 20% jam 14.00–17.00. Creamy, dingin, caramel-nya pas—cocok buat break siang. Balas chat ini untuk order / pickup ya!",
  "cta_variants": ["Order sekarang", "Mau pickup jam berapa?", "Kirim lokasi kamu, kami bantu", "Coba hari ini juga", "Ambil promo happy hour sekarang"],
  "hashtags": ["#IcedCaramelLatte", "#CoffeeBreak", "#KopiJakarta", "#CoffeeLovers", "#CafeJakarta", "#NgopiYuk", "#PromoKopi", "#EsKopi"],
  "disclaimer": "Syarat promo berlaku. Stok terbatas."
}
```

---

## Agent 4 — Creative Director Agent
### Output Schema
```json
{
  "$id": "https://aigrowthcopilot/schema/agent/creative_director.output.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CreativeDirectorOutput",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "creative_concept": { "type": "string", "minLength": 20 },
    "visual_style": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "color_palette": { "type": "array", "items": { "type": "string" }, "minItems": 2 },
        "lighting": { "type": "string" },
        "mood_keywords": { "type": "array", "items": { "type": "string" }, "minItems": 2 }
      },
      "required": ["color_palette", "lighting", "mood_keywords"]
    },
    "storyboard": {
      "type": "array",
      "minItems": 5,
      "maxItems": 9,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "scene_no": { "type": "integer", "minimum": 1 },
          "purpose": { "type": "string" },
          "on_screen_text": { "type": "string" },
          "visual_description": { "type": "string" },
          "emotion": { "type": "string" },
          "duration_sec": { "type": "integer", "minimum": 2, "maximum": 10 }
        },
        "required": ["scene_no", "purpose", "visual_description", "emotion", "duration_sec"]
      }
    }
  },
  "required": ["creative_concept", "visual_style", "storyboard"]
}
```

### Contract Response Contoh
```json
{
  "creative_concept": "Dari lelah jadi chill: break siang yang creamy, manisnya pas, bikin balik fokus.",
  "visual_style": {
    "color_palette": ["caramel", "cream", "coffee-brown"],
    "lighting": "soft natural light, sedikit warm",
    "mood_keywords": ["refreshing", "premium", "cozy"]
  },
  "storyboard": [
    { "scene_no": 1, "purpose": "Hook", "on_screen_text": "Break siang kamu butuh ini", "visual_description": "Close-up tangan menaruh gelas dingin berembun di meja kerja", "emotion": "relatable", "duration_sec": 4 },
    { "scene_no": 2, "purpose": "Product reveal", "on_screen_text": "Iced Caramel Latte", "visual_description": "Slow pan gelas latte dengan es dan caramel swirl", "emotion": "desire", "duration_sec": 5 },
    { "scene_no": 3, "purpose": "Benefit", "on_screen_text": "Creamy • Premium • Seimbang", "visual_description": "Pour susu + espresso shot, transisi ke latte jadi creamy", "emotion": "satisfying", "duration_sec": 6 },
    { "scene_no": 4, "purpose": "Emotional hook", "on_screen_text": "Biar balik fokus", "visual_description": "Orang menyeruput, ekspresi lega, kembali mengetik", "emotion": "relief", "duration_sec": 5 },
    { "scene_no": 5, "purpose": "Offer", "on_screen_text": "Diskon 20% (14.00–17.00)", "visual_description": "Text overlay promo dengan background gelas di dekat jendela", "emotion": "urgency", "duration_sec": 5 },
    { "scene_no": 6, "purpose": "CTA", "on_screen_text": "Order sekarang / Pickup", "visual_description": "Pack shot gelas + logo + tangan ambil dan pergi", "emotion": "action", "duration_sec": 5 }
  ]
}
```

---

## Agent 5 — Video Director Agent
### Output Schema
```json
{
  "$id": "https://aigrowthcopilot/schema/agent/video_director.output.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "VideoDirectorOutput",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "aspect_ratio": { "type": "string", "enum": ["9:16", "16:9", "1:1"] },
    "pace": { "type": "string", "enum": ["slow", "medium", "fast"] },
    "music_mood": { "type": "string" },
    "shot_list": {
      "type": "array",
      "minItems": 6,
      "maxItems": 12,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "scene_no": { "type": "integer", "minimum": 1 },
          "shot_type": { "type": "string", "enum": ["wide", "medium", "close_up", "macro", "overhead"] },
          "camera_movement": { "type": "string", "enum": ["static", "pan", "tilt", "dolly_in", "dolly_out", "handheld"] },
          "subject_action": { "type": "string" },
          "duration_sec": { "type": "integer", "minimum": 2, "maximum": 10 },
          "notes": { "type": "string" }
        },
        "required": ["scene_no", "shot_type", "camera_movement", "subject_action", "duration_sec"]
      }
    },
    "voiceover_script": { "type": "string", "minLength": 50 }
  },
  "required": ["aspect_ratio", "pace", "music_mood", "shot_list", "voiceover_script"]
}
```

### Contract Response Contoh
```json
{
  "aspect_ratio": "9:16",
  "pace": "medium",
  "music_mood": "lofi chill upbeat",
  "shot_list": [
    { "scene_no": 1, "shot_type": "close_up", "camera_movement": "static", "subject_action": "Gelas berembun diletakkan di meja kerja", "duration_sec": 4, "notes": "Fokus pada embun dan es" },
    { "scene_no": 2, "shot_type": "macro", "camera_movement": "pan", "subject_action": "Caramel swirl bergerak di dalam gelas", "duration_sec": 5, "notes": "Slow pan, highlight tekstur" },
    { "scene_no": 3, "shot_type": "close_up", "camera_movement": "dolly_in", "subject_action": "Pour espresso ke susu, terbentuk gradient", "duration_sec": 6, "notes": "Satisfying pour" },
    { "scene_no": 4, "shot_type": "medium", "camera_movement": "static", "subject_action": "Talent menyeruput, ekspresi lega", "duration_sec": 5, "notes": "Natural light" },
    { "scene_no": 5, "shot_type": "close_up", "camera_movement": "static", "subject_action": "Overlay teks promo 20% (14-17)", "duration_sec": 5, "notes": "Text clear, high contrast" },
    { "scene_no": 6, "shot_type": "close_up", "camera_movement": "dolly_out", "subject_action": "Pack shot gelas + logo + tangan ambil", "duration_sec": 5, "notes": "CTA muncul akhir" }
  ],
  "voiceover_script": "Lagi butuh break yang manisnya pas? Ini dia Iced Caramel Latte—creamy, dingin, dan espresso premium. Minggu ini diskon 20% jam dua sampai jam lima. Order sekarang, atau pickup biar nggak antre."
}
```

---

## Agent 6 — PixVerse Agent
### Output Schema
```json
{
  "$id": "https://aigrowthcopilot/schema/agent/pixverse.output.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PixVerseOutput",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "pixverse_prompt": { "type": "string", "minLength": 80 },
    "negative_prompt": { "type": "string" },
    "video_settings": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "duration_sec": { "type": "integer", "minimum": 30, "maximum": 45 },
        "aspect_ratio": { "type": "string", "enum": ["9:16", "16:9", "1:1"] },
        "style": { "type": "string" }
      },
      "required": ["duration_sec", "aspect_ratio", "style"]
    },
    "render_request": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "provider": { "type": "string", "enum": ["pixverse"] },
        "request_id": { "type": "string" },
        "status": { "type": "string", "enum": ["created", "queued", "running", "completed", "failed"] }
      },
      "required": ["provider", "request_id", "status"]
    }
  },
  "required": ["pixverse_prompt", "video_settings", "render_request"]
}
```

### Contract Response Contoh
```json
{
  "pixverse_prompt": "Vertical 9:16 premium coffee ad video, soft warm natural light, close-up iced caramel latte in a clear cup with condensation and ice, caramel swirl, slow pan and dolly shots, satisfying pour of espresso into milk, cozy cafe/work desk setting, modern minimal aesthetic, text overlays: 'Iced Caramel Latte', 'Creamy • Premium • Seimbang', 'Diskon 20% 14.00–17.00', ending CTA 'Order sekarang / Pickup', smooth transitions, lofi chill mood, high detail, realistic product video, 30-45 seconds",
  "negative_prompt": "low quality, blurry, jittery camera, distorted cup, unreadable text, extra fingers, watermark, logo artifacts",
  "video_settings": { "duration_sec": 30, "aspect_ratio": "9:16", "style": "realistic premium ad" },
  "render_request": { "provider": "pixverse", "request_id": "pv_abc123", "status": "created" }
}
```

---

## Agent 7 — Campaign Manager Agent
### Output Schema
```json
{
  "$id": "https://aigrowthcopilot/schema/agent/campaign_manager.output.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CampaignManagerOutput",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "campaign_package": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "summary": { "type": "string" },
        "strategy": { "type": "object" },
        "copy": { "type": "object" },
        "creative": { "type": "object" },
        "video": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "pixverse_prompt": { "type": "string" },
            "video_asset_url": { "type": "string" },
            "duration_sec": { "type": "integer" },
            "aspect_ratio": { "type": "string" }
          },
          "required": ["pixverse_prompt", "duration_sec", "aspect_ratio"]
        },
        "publish_checklist": { "type": "array", "items": { "type": "string" }, "minItems": 5, "maxItems": 12 }
      },
      "required": ["summary", "strategy", "copy", "creative", "video", "publish_checklist"]
    }
  },
  "required": ["campaign_package"]
}
```

### Contract Response Contoh
```json
{
  "campaign_package": {
    "summary": "Kampanye 7 hari untuk mendorong transaksi Iced Caramel Latte lewat promo happy hour dan konten video pendek yang satisfying.",
    "strategy": {
      "campaign_name": "Caramel Chill Break",
      "objective": "conversion",
      "offer": "Diskon 20% jam 14.00–17.00 selama 7 hari",
      "channels": ["instagram", "tiktok", "whatsapp"],
      "publishing_plan": { "duration_days": 7, "posts_per_day": 2, "best_time_windows": ["11:30-13:00", "15:00-17:30"] }
    },
    "copy": {
      "instagram_caption": "Lagi butuh break yang manisnya pas? ...",
      "tiktok_caption": "Creamy caramel yang manisnya pas...",
      "facebook_post": "Iced Caramel Latte siap jadi penyelamat...",
      "whatsapp_broadcast": "Hai! Minggu ini ada promo..."
    },
    "creative": {
      "creative_concept": "Dari lelah jadi chill...",
      "storyboard_scenes": 6
    },
    "video": {
      "pixverse_prompt": "Vertical 9:16 premium coffee ad video...",
      "video_asset_url": "https://minio.local.example/bucket/campaigns/.../video.mp4",
      "duration_sec": 30,
      "aspect_ratio": "9:16"
    },
    "publish_checklist": [
      "Upload video ke TikTok dan IG Reels",
      "Pin posting promo selama periode kampanye",
      "Aktifkan quick reply untuk WA order",
      "Pastikan jam promo tercantum jelas di caption",
      "Siapkan stok bahan untuk jam 14.00–17.00",
      "Pantau DM/WA dan respon < 5 menit"
    ]
  }
}
```

---

# Contract Request/Response Contoh (End-to-End)

## 1) Create Campaign (input user)
**Request**
```json
{
  "product": {
    "name": "Iced Caramel Latte",
    "description": "Kopi premium dengan sirup caramel dan susu segar.",
    "price": { "currency": "IDR", "amount": 25000 },
    "category": "Coffee",
    "image_urls": ["https://.../latte.jpg"]
  },
  "options": {
    "language": "id",
    "primary_goal": "conversion",
    "brand_tone": "hangat, premium, friendly",
    "target_location": "Jakarta"
  }
}
```

**Response**
```json
{
  "campaign_id": "b6cf4b0d-6d3a-4cf0-bd31-3a5c9c2d1a7a",
  "status": "draft"
}
```

## 2) Start Generation
**Response**
```json
{
  "campaign_id": "b6cf4b0d-6d3a-4cf0-bd31-3a5c9c2d1a7a",
  "campaign_status": "running",
  "current_step_key": "product_analyst"
}
```

## 3) Get Progress (poll)
**Response**
```json
{
  "campaign_id": "b6cf4b0d-6d3a-4cf0-bd31-3a5c9c2d1a7a",
  "campaign_status": "running",
  "current_step_key": "pixverse",
  "steps": [
    { "step_key": "product_analyst", "status": "success" },
    { "step_key": "marketing_strategist", "status": "success" },
    { "step_key": "copywriter", "status": "success" },
    { "step_key": "creative_director", "status": "success" },
    { "step_key": "video_director", "status": "success" },
    { "step_key": "pixverse", "status": "running" },
    { "step_key": "campaign_manager", "status": "queued" }
  ],
  "error": null
}
```

## 4) Completed
**Response**
```json
{
  "campaign_id": "b6cf4b0d-6d3a-4cf0-bd31-3a5c9c2d1a7a",
  "campaign_status": "complete",
  "campaign_package": {
    "strategy": { "campaign_name": "Caramel Chill Break", "objective": "conversion" },
    "assets": {
      "product_images": ["https://.../latte.jpg"],
      "video_url": "https://.../video.mp4"
    }
  }
}
```
