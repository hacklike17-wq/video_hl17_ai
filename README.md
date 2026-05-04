# Video AI

Pipeline tự động sản xuất video ngắn (TikTok / Reels / YouTube Shorts) — mining ý tưởng → sinh script → render voice + avatar + b-roll → ghép video → đăng bài.

Built as a single Next.js app deployed via Docker Compose. Bạn chỉ cần Airtable-style review UI tích hợp sẵn — không cần n8n, không cần Airtable.

> 📖 Chi tiết kiến trúc + UI structure: xem **[PLAN.md](./PLAN.md)**.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind + shadcn/ui
- **SQLite** + **Drizzle ORM** (1 file DB, không cần server)
- **BullMQ** + Redis cho async jobs (Argil/Submagic callbacks)
- **Docker Compose** (app + worker + redis + caddy)
- **Single password auth** (jose JWT cookie)

## Quick start (local dev)

```bash
# 1) Install deps
npm install

# 2) Setup env
cp .env.example .env

# 3) Generate secrets
openssl rand -base64 32              # → AUTH_SECRET trong .env
npm run auth:hash -- "matkhau-cua-ban"  # → ADMIN_PASSWORD_HASH trong .env

# 4) Init DB
npm run db:generate
npm run db:migrate

# 5) Start
npm run dev      # http://localhost:3000

# (optional, cần Redis local) — chạy worker queue:
npm run worker
```

Login với `ADMIN_EMAIL` + password vừa hash.

## Deploy lên VPS

```bash
ssh root@your-vps
git clone https://github.com/hacklike17-wq/video_hl17_ai.git video_ai
cd video_ai
cp .env.example .env
# sửa .env: AUTH_SECRET, ADMIN_*, API keys, APP_DOMAIN
docker compose up -d
docker compose exec app npm run db:migrate
```

Truy cập `https://your-domain` (Caddy tự cấp HTTPS).

## Pipeline (sẽ build dần qua các phase)

```
[Cron 4h]
  Apify TikTok Scraper → Claude (score) → DB: ideas

[Bạn duyệt ideas trong UI]

[Click "Generate Script"]
  Claude → DB: scripts (pending review)

[Bạn duyệt script]

[Click "Approve"]
  Queue 3 jobs:
    ├─ ElevenLabs MP3 → Cloudinary
    ├─ Argil (async webhook)
    └─ Pexels b-roll search
  → DB: videos (generating_assets)

[Argil callback]
  → Submagic POST → status: rendering

[Submagic callback]
  → DB: videos (pending_review)

[Bạn duyệt video + chọn lịch + platforms]

[Click "Approve & Schedule"]
  → Buffer API → đăng theo lịch
```

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Foundation: Next.js, DB, auth, brand, Docker | ✅ Done |
| 2 | Ideas: Apify crawl + Claude scoring + Kanban | ⏳ Pending |
| 3 | Scripts: generate + edit + approve | ⏳ Pending |
| 4 | Assets: voice / avatar / b-roll qua queue | ⏳ Pending |
| 5 | Videos: Submagic webhook + review UI | ⏳ Pending |
| 6 | Publish: Buffer scheduler + calendar | ⏳ Pending |
| 7 | Deploy hardening: cron + monitoring | ⏳ Pending |

## Scripts

| Command | Mô tả |
|---------|-------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run typecheck` | TS check |
| `npm run db:generate` | Generate migrations từ schema |
| `npm run db:migrate` | Apply migrations vào SQLite |
| `npm run db:studio` | Drizzle Studio UI |
| `npm run auth:hash -- "<pwd>"` | Tạo bcrypt hash cho admin password |
| `npm run worker` | Chạy BullMQ worker (Phase 4+) |
