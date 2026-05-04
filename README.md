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

Yêu cầu: VPS có Docker + Compose, port 80/443 mở, key SSH.

```bash
ssh root@your-vps
cd /root && git clone https://github.com/hacklike17-wq/video_hl17_ai.git video-ai
cd video-ai
cp .env.example .env
# Sửa .env: paste các giá trị (xem mục bên dưới)
./scripts/deploy.sh
```

### Tạo các giá trị bắt buộc cho .env (chạy ở local)

```bash
openssl rand -base64 32                     # AUTH_SECRET
openssl rand -hex 16                        # CRON_SECRET
npm run auth:hash -- "matkhau-admin"        # ADMIN_PASSWORD_HASH
                                            # Script in ra 2 dòng:
                                            #   - dòng "for LOCAL dev"  → dùng cho .env local
                                            #   - dòng "for DEPLOY"     → paste vào .env trên VPS
```

Lưu ý quan trọng: bcrypt hash chứa `$`. Trên VPS dùng escape `$$` (compose convention), local dev dùng `\$` (dotenv-expand convention). Script `auth:hash` đã in cả 2 dòng — copy đúng dòng cho môi trường của bạn.

Domain: nếu có domain trỏ về IP VPS, set `APP_DOMAIN=yourdomain.com` trong .env → Caddy tự cấp HTTPS. Không có domain → set `APP_DOMAIN=:80` → chạy HTTP qua IP.

### Re-deploy sau khi push code mới

```bash
ssh root@your-vps
cd /root/video-ai && ./scripts/deploy.sh
```

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
