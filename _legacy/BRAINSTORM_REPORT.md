# Báo Cáo Brainstorm: Hệ Thống Sản Xuất Video AI Hybrid

**Ngày:** 2026-05-04
**Mục tiêu:** ~10 video/tuần short-form (<60s) cho TikTok/Reels, hybrid format (30% talking-head + 70% b-roll), chủ thể là chính người dùng (self-clone, không vướng pháp lý).

---

## 1. Problem Statement

Cần hệ thống bán tự động:
1. Khai thác idea/trend từ MXH theo chủ đề định sẵn
2. Sinh script giữ tone cá nhân
3. Render video hybrid: clip avatar AI nói hook + voiceover trên b-roll
4. Có review gate trước khi publish
5. Mở rộng được — sau này swap/ghép thêm API mới dễ dàng

**Ràng buộc cốt lõi:**
- Solo/team nhỏ, không có ML engineer
- Quality > quantity (chống AI slop, tránh demonetize)
- Phải có Brand Profile consistent (mặt + giọng + visual style)

---

## 2. Phương án đã đánh giá

| Phương án | Thời gian build | Cost/tháng (40 video) | Phù hợp khi |
|-----------|-----------------|----------------------|-------------|
| A. No-code (n8n + APIs) | 2-3 tuần | ~$250-400 | Bắt đầu, validate workflow |
| B. Hybrid (n8n + Web App) | 4-6 tuần | ~$280-450 | Đã validate, cần UX tốt hơn |
| C. Full Custom (self-host model) | 3-6 tháng | $500+ GPU | >500 video/tháng — KHÔNG áp dụng |

**Chốt: A → B (làm A trước 4 tuần, validate, rồi nâng cấp B)**

---

## 3. Kiến Trúc Đề Xuất (Phương án A)

```
┌─────────────────────────────────────────────────────────────┐
│  IDEA LAYER                                                 │
│  Apify (TikTok/YT scraper) ──► Airtable [Idea Pool]         │
│  + Manual input              ──►   ↓                        │
└────────────────────────────────────┼────────────────────────┘
                                     │ (Human pick top 10)
┌────────────────────────────────────▼────────────────────────┐
│  CONTENT LAYER                                              │
│  Claude API (script + hook + b-roll cues)                   │
│  Input: Idea + BrandProfile + last 5 viral hooks            │
│  Output: { hook, script, broll_prompts[], cta }             │
└────────────────────────────────────┼────────────────────────┘
                                     │ (Auto, có thể edit tay)
┌────────────────────────────────────▼────────────────────────┐
│  ASSET LAYER (parallel)                                     │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐       │
│  │ ElevenLabs  │ │ HeyGen/Argil │ │ Pexels + Veo 3  │       │
│  │ voiceover   │ │ avatar clip  │ │ b-roll clips    │       │
│  └─────────────┘ └──────────────┘ └─────────────────┘       │
└────────────────────────────────────┼────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────┐
│  ASSEMBLY LAYER                                             │
│  Submagic API (auto-edit + caption + music)                 │
│  HOẶC Creatomate API (template-based, kiểm soát hơn)        │
└────────────────────────────────────┼────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────┐
│  REVIEW GATE (Human)                                        │
│  Notion/Airtable view: preview + approve/reject/regen       │
└────────────────────────────────────┼────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────┐
│  PUBLISH LAYER                                              │
│  Buffer/Metricool API (multi-platform schedule)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Tool Stack Chốt

| Layer | Tool | Lý do | Cost |
|-------|------|-------|------|
| Orchestration | **n8n self-host** | Open source, không vendor lock-in, swap node dễ | $20 VPS |
| Idea DB | **Airtable** | Free tier đủ, view/filter mạnh, có button trigger | $0-20 |
| Trend mining | **Apify TikTok Scraper** | Pay-per-run, tránh tự crawl rủi ro pháp lý | $30-50 |
| LLM script | **Claude Sonnet 4.6** | Giữ tone tốt, prompt caching tiết kiệm | $30-50 |
| Voice clone | **ElevenLabs** | Tiếng Việt OK, Instant Voice Clone | $22 (Creator) |
| Avatar | **Argil** (chính), HeyGen (backup) | Argil rẻ + tiếng Việt tốt hơn HeyGen 2026 | $39-89 |
| B-roll stock | **Pexels API** + **Storyblocks** | Free + premium hybrid | $0-30 |
| B-roll generative | **Veo 3 Fast** (chỉ khi cần) | Cho cảnh không tìm được stock | $50-100 |
| Auto-edit | **Submagic API** | Caption tiếng Việt tốt, viral templates | $25-50 |
| Publish | **Buffer** hoặc Metricool | Multi-platform, có analytics | $15-30 |

**Tổng: ~$250-400/tháng cho ~40 video**

---

## 5. Brand Profile Schema (Cốt lõi)

Lưu trong Airtable hoặc Postgres (nếu lên phương án B):

```yaml
brand_profile:
  identity:
    name: "Henry"
    voice_id_elevenlabs: "xxx"
    avatar_id_argil: "yyy"

  voice_style:
    pace: "medium-fast"
    energy: 7/10
    filler_words: ["ờ thì", "thật ra"]
    signature_phrases: ["..."]
    forbidden_phrases: [...]

  visual_style:
    primary_color: "#FF6B35"
    font: "SVN-Gilroy"
    lower_third_template: "lt_v2.json"
    intro_clip: "intro_3s.mp4"
    broll_filter: "warm_film"
    aspect: "9:16"

  content_rules:
    pillars: [tech, productivity, AI tools]
    banned_topics: [politics, religion, ...]
    cta_default: "Follow để xem thêm"
    hook_examples: [list of 20 viral hooks đã dùng]
    script_examples: [5 script tốt nhất đã làm — few-shot cho LLM]
```

→ Mỗi lần gen script, LLM nhận BrandProfile + Idea → output giữ giọng văn nhất quán. **DRY tuyệt đối**.

---

## 6. Pipeline Cụ Thể Cho Hybrid Video <60s

**Cấu trúc chuẩn của 1 video 45-55s:**
```
[0-3s]   Hook: Avatar nói thẳng camera (talking-head)
[3-8s]   Setup problem: voiceover + b-roll quick cuts
[8-35s]  Body: voiceover + b-roll (có thể chèn 1-2 cut avatar 2s)
[35-50s] Payoff/Insight: avatar talking-head trở lại
[50-55s] CTA: avatar + text overlay
```

**Asset generation per video:**
- 2-3 clip avatar (tổng ~15s) — Argil
- 1 voiceover full ~50s — ElevenLabs (cho phần b-roll)
- 8-12 b-roll clips 3-5s mỗi cái — Pexels (90%) + Veo (10%)
- Caption auto từ voiceover — Submagic

**Time per video (sau khi pipeline ổn):**
- Auto: ~8-12 phút (chờ render)
- Human review + tweak: 5-10 phút
- → 10 video/tuần ≈ 2-3 giờ active work/tuần

---

## 7. Risks & Mitigations

| Rủi ro | Mức độ | Mitigation |
|--------|--------|-----------|
| Vendor đổi giá / shutdown API | High | n8n abstraction layer, mỗi service chỉ ở 1 node — swap dễ |
| AI content bị TikTok/YT penalize | High | Human review, không spam, tone cá nhân hóa, mix b-roll thật |
| Voice/avatar uncanny valley | Medium | Limit avatar chỉ 25-30% video (hook + payoff), voice có signature phrases |
| Trend mining bị rate-limit | Medium | Dùng Apify thay vì tự crawl, có cache 24h |
| Chi phí leo thang khi scale | Medium | Veo 3 chỉ dùng khi cần, ưu tiên stock; cache b-roll dùng lại |
| Idea trùng lặp / sao chép | Low-Med | LLM kiểm tra similarity với 50 video gần nhất trước khi approve |

---

## 8. Roadmap 4 Tuần (Phương án A)

**Tuần 1: Foundation**
- Setup n8n VPS, Airtable schema, Brand Profile
- Tạo voice clone (ElevenLabs) + avatar (Argil) — cần 5-10 phút video gốc + 30 phút audio sạch của bạn
- Test 1 video manual end-to-end qua từng tool

**Tuần 2: Pipeline**
- Build n8n workflow: Idea → Script → Asset gen → Assembly
- Prompt engineering cho script (few-shot với BrandProfile)
- Template assembly trên Submagic/Creatomate

**Tuần 3: Idea Mining + Review**
- Apify scrapers cho 3-5 nguồn trend
- Airtable review dashboard với approve button
- Webhook publish to Buffer

**Tuần 4: Iterate**
- Sản xuất 10 video thật, đo metrics
- Tinh chỉnh prompt + template dựa vào perf
- Document lại pipeline

---

## 9. Success Metrics

**Operational:**
- Time per video (target: <15 phút active work)
- Cost per video (target: <$10)
- Pipeline reliability (target: >90% chạy không lỗi)

**Content:**
- Average view rate (so với baseline manual)
- Hook retention (3s, 10s)
- Approve rate ở review gate (target >70% — nếu thấp = prompt/asset chưa tốt)

**Business:**
- Follower growth rate
- Engagement rate
- Có monetize/lead được không (tùy mục tiêu cuối)

---

## 10. Quyết Định Quan Trọng & Trade-offs

✅ **Chọn:** No-code n8n trước, không tự code backend
- Vì validate workflow nhanh hơn build, swap tool dễ

✅ **Chọn:** Hybrid 30/70 (avatar/b-roll), không full talking-head
- Tránh uncanny valley, đỡ nhàm, viral hơn

✅ **Chọn:** Argil > HeyGen cho avatar
- Tiếng Việt tốt hơn 2026, rẻ hơn, API ổn

✅ **Chọn:** Human review BẮT BUỘC trước publish
- Không có shortcut — đây là sự khác biệt giữa kênh sống và kênh chết

❌ **KHÔNG làm:** Self-host AI model
- Sẽ tốn 3-6 tháng, chất lượng thua API thương mại

❌ **KHÔNG làm:** Tự crawl trực tiếp TikTok/IG
- Vướng ToS, rate limit, ban IP. Dùng Apify.

❌ **KHÔNG làm:** Multi-brand từ đầu
- Validate 1 brand (chính bạn) trước, multi-brand thêm complexity 3x

---

## 11. Next Steps

1. **Confirm:** Đồng ý kiến trúc + tool stack ở trên?
2. **Prep assets:** Quay 5-10 phút video chính diện (đủ ánh sáng) + thu 30 phút audio sạch để clone voice/avatar
3. **Setup tài khoản:** ElevenLabs Creator, Argil, Apify, Airtable, n8n VPS, Submagic
4. **Define Brand Profile v1:** Fill schema mục 5 với data thật
5. **Bắt đầu Tuần 1** theo roadmap

**Cần thêm trước khi code:** prompt template chi tiết cho script generator + 5 video reference (của bạn hoặc đối thủ) để LLM học tone.

---

## Phụ lục: Khi nào lên Phương án B

Trigger nâng cấp lên web app riêng:
- Volume > 20 video/tuần (n8n UI bắt đầu chậm)
- Cần multi-brand (>2 brand)
- Team > 2 người cùng review
- Cần analytics dashboard tùy chỉnh
- Khách hàng muốn self-serve

Trước những trigger này, **đừng** rời n8n. KISS.
