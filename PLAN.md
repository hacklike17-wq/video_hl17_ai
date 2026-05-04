# Video AI — Next.js Implementation Plan

> Pivot from Airtable + n8n → single Next.js app on VPS.
> Target: 1 dev (you) clicks ít nhất, Claude code 95%, deploy 1 lệnh.

---

## 1. Tech Stack

| Layer | Choice | Lý do |
|-------|--------|-------|
| Framework | **Next.js 15** (App Router) + TypeScript | All-in-one: UI + API + cron + webhook |
| DB | **SQLite** + **Drizzle ORM** | 1 file, không cần DB server riêng, đủ cho 1 user |
| Queue | **BullMQ** + Redis | Async jobs (Argil/Submagic chạy 5–15 phút) |
| UI | **shadcn/ui** + Tailwind v4 | Đẹp sẵn, không phải design |
| State / Data | React Server Components + Server Actions | Giảm boilerplate API |
| Auth | **Single password** (NextAuth Credentials hoặc lucia) | Chỉ mình bạn dùng |
| File hosting | **Cloudinary** (đã có) | Host MP3 ElevenLabs cho Submagic fetch |
| Deploy | **Docker Compose** (Next.js + Redis + Caddy) | 1 lệnh `docker compose up -d` |
| Reverse proxy | **Caddy** | Auto HTTPS Let's Encrypt |

---

## 2. Folder Structure

```
video_ai/
├─ app/                          # Next.js App Router
│  ├─ (auth)/
│  │  └─ login/page.tsx
│  ├─ (app)/                     # protected layout
│  │  ├─ layout.tsx              # sidebar + header
│  │  ├─ page.tsx                # dashboard
│  │  ├─ ideas/
│  │  │  ├─ page.tsx             # kanban board
│  │  │  └─ [id]/page.tsx        # idea detail + generate script btn
│  │  ├─ scripts/
│  │  │  ├─ page.tsx             # list pending review
│  │  │  └─ [id]/page.tsx        # script editor + approve btn
│  │  ├─ videos/
│  │  │  ├─ page.tsx             # video kanban (status)
│  │  │  └─ [id]/page.tsx        # video preview + approve/schedule
│  │  ├─ brand/page.tsx          # BrandProfile editor
│  │  ├─ schedule/page.tsx       # calendar of scheduled posts
│  │  └─ jobs/page.tsx           # queue monitor (BullMQ board)
│  ├─ api/
│  │  ├─ webhooks/
│  │  │  ├─ argil/route.ts       # Argil callback
│  │  │  └─ submagic/route.ts    # Submagic callback
│  │  ├─ cron/
│  │  │  ├─ crawl-ideas/route.ts # Apify trigger (every 4h)
│  │  │  └─ publish/route.ts     # check scheduled posts
│  │  └─ trigger/                # internal endpoints (server actions cũng đủ)
│  └─ globals.css
│
├─ src/
│  ├─ db/
│  │  ├─ schema.ts               # Drizzle schema
│  │  ├─ index.ts                # db client
│  │  └─ migrations/
│  ├─ lib/
│  │  ├─ auth.ts                 # session helper
│  │  ├─ env.ts                  # validated env (zod)
│  │  └─ utils.ts
│  ├─ services/                  # external API wrappers
│  │  ├─ claude.ts               # script gen + idea scoring
│  │  ├─ elevenlabs.ts           # TTS
│  │  ├─ argil.ts                # avatar render
│  │  ├─ pexels.ts               # b-roll search
│  │  ├─ submagic.ts             # video assembly
│  │  ├─ apify.ts                # tiktok crawler
│  │  ├─ cloudinary.ts           # MP3 upload
│  │  └─ buffer.ts               # social publish
│  ├─ jobs/                      # BullMQ workers
│  │  ├─ queue.ts                # queue definitions
│  │  ├─ worker.ts               # entry point (separate process)
│  │  ├─ crawl-ideas.ts
│  │  ├─ score-ideas.ts
│  │  ├─ generate-script.ts
│  │  ├─ generate-voice.ts
│  │  ├─ generate-avatar.ts
│  │  ├─ fetch-broll.ts
│  │  ├─ assemble-video.ts
│  │  └─ publish-video.ts
│  ├─ components/
│  │  ├─ ui/                     # shadcn components
│  │  ├─ ideas/
│  │  ├─ scripts/
│  │  ├─ videos/
│  │  └─ shared/
│  └─ types/
│
├─ data/                         # gitignored
│  └─ app.db                     # SQLite
│
├─ public/
├─ docker-compose.yml
├─ Dockerfile
├─ Caddyfile
├─ drizzle.config.ts
├─ next.config.ts
├─ tailwind.config.ts
├─ package.json
├─ .env.example
└─ README.md
```

---

## 3. Database Schema (Drizzle / SQLite)

```ts
brandProfile:
  id, name, voiceIdElevenLabs, voiceIdArgil, avatarIdArgil,
  voiceStyle (text), signaturePhrases, contentPillars, bannedTopics,
  primaryColor, submagicTemplateId, hookExamples, scriptExamples,
  defaultCta, createdAt, updatedAt

ideas:
  id, title, hookText, sourceUrl, sourcePlatform (enum),
  viewCount, postedDate, crawledDate, pillar, score (real), angle,
  status (enum: idea|approved|script_gen|done|rejected),
  brandId (fk), rawData (json)

scripts:
  id, ideaId (fk), brandId (fk), version,
  hook, setup, body, payoff, cta, brollPrompts (json),
  status (enum: draft|pending_review|approved|rendering|done|rejected),
  rejectReason, createdAt

videos:
  id, scriptId (fk),
  argilJobId, submagicProjectId,
  voiceUrl, avatarUrl, brollUrls (json), finalUrl,
  thumbnailUrl, duration, caption,
  status (enum: generating_assets|assembling|rendering|pending_review|
                approved|scheduled|published|rejected|argil_failed|submagic_failed),
  rejectReason, scheduledAt, publishedAt, platforms (json),
  bufferIds (json), createdAt

users:
  id, email, passwordHash, createdAt   # 1 row, single user

jobsLog:                                # audit trail
  id, jobType, status, payload, error, createdAt
```

---

## 4. UI Hierarchy & Page Design

### Layout shell (`app/(app)/layout.tsx`)

```
┌─────────────────────────────────────────────────────────┐
│ TopBar:  [Video AI]      [search]    [user menu]        │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │  Main content                                │
│          │                                              │
│ ◉ Dashboard                                             │
│ ◉ Ideas         (5)                                     │
│ ◉ Scripts       (2 pending)                             │
│ ◉ Videos        (1 pending)                             │
│ ◉ Schedule                                              │
│ ◉ Brand                                                 │
│ ◉ Jobs                                                  │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Page-by-page

#### `/` — Dashboard
- 4 stat cards: Ideas hôm nay / Scripts pending / Videos rendering / Published tuần này
- Last 5 jobs (link → /jobs)
- Quick action: "Crawl ideas now"

#### `/ideas` — Kanban board
Columns: `Idea` → `Approved` → `Script Gen` → `Done` / `Rejected`
- Card: thumbnail, title, score, hook, source platform icon, view count
- Drag → đổi status (server action)
- Filter: pillar, score range, date
- Top-right button: **+ Crawl now** (trigger Apify job)

#### `/ideas/[id]` — Idea detail
- Đầy đủ source URL, view count, hook, angle Claude đề xuất
- Edit angle inline
- Button **Generate Script** → tạo job → redirect `/scripts/[id]` khi xong (hoặc trang loading)

#### `/scripts` — List
- Table view: title, version, status, idea, created, action
- Filter: pending review

#### `/scripts/[id]` — Script editor
```
┌─────────────────────────────────────────────────────────┐
│ Script: "Tại sao AI không thay thế devs"   v1   [Draft] │
├─────────────────────────────────────────────────────────┤
│ Hook    [editable textarea]                             │
│ Setup   [editable textarea]                             │
│ Body    [editable textarea]                             │
│ Payoff  [editable textarea]                             │
│ CTA     [editable textarea]                             │
├─────────────────────────────────────────────────────────┤
│ B-roll prompts (5)                                      │
│   1. "developer at laptop, late night..."  [edit]       │
│   ...                                                   │
├─────────────────────────────────────────────────────────┤
│ [Regenerate]  [Reject]          [✓ Approve & Render]    │
└─────────────────────────────────────────────────────────┘
```
Nút Approve → tạo Video record → push 3 jobs (voice, avatar, broll) → redirect `/videos/[id]`.

#### `/videos` — Kanban by render status
Columns: `Generating Assets` → `Assembling` → `Pending Review` → `Approved` → `Scheduled` → `Published` / `Failed`
- Card: thumbnail, title, status badge, duration, retry button nếu failed

#### `/videos/[id]` — Video review
```
┌─────────────────────────────────────────────────────────┐
│ Video: "Tại sao AI không thay thế devs"  [Pending Review]│
├──────────────────────┬──────────────────────────────────┤
│                      │  Caption                         │
│     [video player]   │  [editable textarea]             │
│      (final_url)     │                                  │
│                      │  Platforms                       │
│                      │  ☑ TikTok ☑ IG ☑ YouTube         │
│                      │                                  │
│                      │  Schedule                        │
│                      │  [datetime picker]               │
│                      │                                  │
│                      │  [Reject]   [✓ Approve & Schedule]│
└──────────────────────┴──────────────────────────────────┘
- Asset details (voice, avatar, broll URLs) collapsible
- Job timeline (Argil 4m, Submagic 2m, ...)
```

#### `/brand` — Brand profile editor
Form đơn giản, lưu vào `brandProfile` (1 row).

#### `/schedule` — Calendar
View tháng/tuần các video đã scheduled / published.

#### `/jobs` — Queue monitor
List BullMQ jobs (waiting / active / failed) + retry/cancel buttons.

---

## 5. API Routes & Server Actions

### Webhook endpoints (public, secured by signature/secret)
- `POST /api/webhooks/argil` → set `videos.avatarUrl`, push `assemble-video` job
- `POST /api/webhooks/submagic` → set `videos.finalUrl`, set status `pending_review`

### Cron endpoints (called by host cron / Vercel cron)
- `GET /api/cron/crawl-ideas?secret=X` (every 4h) → push `crawl-ideas` job
- `GET /api/cron/publish?secret=X` (every 5m) → check scheduled videos due → push `publish-video` job

### Server Actions (no API needed)
- `approveIdea(id)`, `rejectIdea(id)`
- `generateScript(ideaId)` → push job
- `approveScript(id)` → create video + push 3 asset jobs
- `regenerateScript(id)`
- `approveVideo(id, caption, scheduledAt, platforms)`
- `rejectVideo(id, reason)`
- `crawlNow()` → push job

---

## 6. Background Jobs (BullMQ)

| Job | Trigger | Duration | What it does |
|-----|---------|----------|--------------|
| `crawl-ideas` | Cron 4h | ~30s | Apify TikTok scraper → save raw → push `score-ideas` |
| `score-ideas` | After crawl | ~10s/idea | Claude classify + score + angle → save |
| `generate-script` | User click | ~15s | Claude → fill `scripts` table |
| `generate-voice` | Approve script | ~20s | ElevenLabs MP3 → Cloudinary → save URL |
| `generate-avatar` | Approve script | async, callback | Argil POST → save jobId → wait webhook |
| `fetch-broll` | Approve script | ~5s | Pexels search per prompt → save URLs |
| `assemble-video` | After all 3 ready | async, callback | Submagic POST → wait webhook |
| `publish-video` | Cron 5m / immediate | ~5s | Buffer API → save bufferIds |

Worker chạy thành **process riêng** (`npm run worker`) để Next.js dev không block.

---

## 7. Auth (siêu đơn giản)

- 1 user duy nhất, env var `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`
- Login form `/login` → set HTTP-only cookie session
- Middleware bảo vệ `/(app)/*`
- Không cần signup, không reset password, mất pass thì sửa env

---

## 8. Deployment (VPS)

```
docker-compose.yml:
  - app          (Next.js production build)
  - worker       (same image, command override)
  - redis        (BullMQ + cache)
  - caddy        (reverse proxy + auto HTTPS)
  - cron         (alpine + curl, gọi /api/cron/*)
  
volumes:
  - ./data       (SQLite + uploaded files)
  - caddy_data   (certs)
```

Setup VPS (1 lần):
```bash
ssh root@vps
git clone <repo>
cp .env.example .env && nano .env    # paste API keys
docker compose up -d
```

---

## 9. Implementation Phases (incremental, mỗi phase deploy được)

| Phase | Scope | Time | Deliverable |
|-------|-------|------|-------------|
| **1. Foundation** | Next.js + Drizzle + auth + brand profile + Docker | ~2h | Login + brand form chạy local |
| **2. Ideas** | DB + kanban UI + Apify crawl + Claude score | ~2h | Crawl manual, see kanban |
| **3. Scripts** | Generate + edit + approve UI | ~1.5h | Click idea → script ra |
| **4. Assets** | Voice + Avatar + B-roll jobs + queue + worker | ~2h | Script approve → 3 assets ready |
| **5. Video review** | Submagic webhook + video UI + approve | ~1.5h | Render xong, review được |
| **6. Publish** | Buffer + scheduler + calendar | ~1h | Schedule lên TikTok/IG/YT |
| **7. Deploy** | Caddy + cron + production hardening | ~1h | Live trên VPS |

**Tổng ~11 giờ work của Claude. User chỉ paste API keys + chạy lệnh deploy.**

---

## 10. Câu hỏi cuối trước khi start coding

1. **VPS đã có chưa?** Nếu chưa, tôi recommend Hetzner CX22 ($5/tháng, EU) hoặc DigitalOcean Singapore ($6/tháng, gần VN). Tôi không mua hộ được — bạn tự đăng ký.
2. **Domain** — bạn có domain riêng (cho HTTPS auto) chưa? Tạm thời dùng IP cũng được.
3. **Bạn ok bắt đầu Phase 1 luôn không?** (foundation: project skeleton, DB, auth, brand UI, Docker — ~2h work, có thể chạy local ngay). Phase 2-7 sẽ làm sau.
4. **Có muốn giữ lại** `airtable-schema/`, `n8n-workflows/`, `infra/` không, hay xóa cho gọn? (tôi đề xuất di chuyển vào `_legacy/` để khỏi nhầm).

---

## Status
- [ ] Plan approved
- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
- [ ] Phase 5
- [ ] Phase 6
- [ ] Phase 7
