# Video AI Pipeline — Setup Guide

Pipeline tự động sản xuất video TikTok/Reels < 60s hybrid (avatar + b-roll voiceover).

## Project Structure

```
video_ai/
├── BRAINSTORM_REPORT.md          # Tài liệu thiết kế
├── SETUP.md                      # File này
├── package.json                  # Node deps cho test scripts
├── .env.example                  # Template env vars
│
├── infra/                        # Docker Compose cho VPS
│   ├── docker-compose.yml        # n8n + Postgres + Caddy
│   ├── Caddyfile                 # SSL reverse proxy
│   ├── setup-vps.sh              # Init script cho Ubuntu VPS
│   └── .env.example              # VPS-specific env
│
├── ui-mockup/
│   └── index.html                # Mockup UI (mở browser xem)
│
├── api-tests/                    # Test connectivity từng API
│   ├── _lib.mjs                  # Shared helpers
│   ├── test-claude.mjs           # Generate sample script
│   ├── test-elevenlabs.mjs       # Generate voice clip
│   ├── test-argil.mjs            # List avatars/voices
│   ├── test-apify.mjs            # Scrape 5 TikTok videos
│   ├── test-pexels.mjs           # Search b-roll
│   ├── test-submagic.mjs         # API auth check
│   ├── test-airtable.mjs         # CRUD test
│   ├── test-buffer.mjs           # List channels
│   └── run-all.mjs               # Run hết
│
├── n8n-workflows/                # Import vào n8n
│   ├── 01-trend-crawler.json     # Cron 4h
│   ├── 02-script-generator.json  # Webhook
│   ├── 03-asset-generator.json   # Webhook
│   └── 04-publish.json           # Webhook
│
├── airtable-schema/
│   ├── schema.json               # Spec dạng JSON
│   └── SETUP_AIRTABLE.md         # Hướng dẫn tạo manually
│
└── docs/                         # (sẽ thêm runbook, troubleshooting)
```

---

## Roadmap Setup (theo thứ tự)

### Phase 0 — Local prep (30 phút)

**0.1.** Copy env template:
```bash
cp .env.example .env
```

**0.2.** Install Node deps:
```bash
npm install
```

**0.3.** Mở UI mockup để hình dung:
```bash
npm run ui:mockup
# hoặc: open ui-mockup/index.html
```

---

### Phase 1 — Brand Assets (1 ngày, làm song song với Phase 2)

#### 1.1 Voice Clone (ElevenLabs)
- Vào https://elevenlabs.io → Voices → Add a new voice → Instant Voice Cloning
- Upload 3-10 phút audio sạch (mic tốt, no echo, mix nhiều tone: vui/nghiêm túc/kể chuyện)
- Đặt tên voice: "Henry-VN-v1"
- Copy `voice_id` → paste vào `.env` → `ELEVENLABS_VOICE_ID`

#### 1.2 Avatar Clone (Argil)
- Vào https://argil.ai → Studio → Create Avatar
- Quay 5-10 phút video chính diện (1080p, ánh sáng đều, áo trơn, bg gọn)
- Upload, chờ training 2-24h
- Copy `avatar_id` + `voice_id` → `.env`

#### 1.3 Get API Keys
Set vào `.env`:
- ✅ ANTHROPIC_API_KEY (https://console.anthropic.com/)
- ✅ ELEVENLABS_API_KEY (Profile → API Keys)
- ✅ ARGIL_API_KEY (Settings → API)
- ✅ APIFY_TOKEN (Account → Integrations)
- ✅ PEXELS_API_KEY (https://www.pexels.com/api/)
- ✅ SUBMAGIC_API_KEY (Account → API)
- ✅ AIRTABLE_API_KEY (https://airtable.com/create/tokens)
- ✅ BUFFER_ACCESS_TOKEN (https://publish.buffer.com/profiles/...)

#### 1.4 Test all API connectivity
```bash
npm run test:all
```
Kết quả mong đợi: 8/8 tests passed.

Test riêng từng API nếu fail:
```bash
npm run test:claude
npm run test:elevenlabs
# ...
```

---

### Phase 2 — Airtable Setup (1-2h)

Theo file `airtable-schema/SETUP_AIRTABLE.md`:
1. Tạo base "Video AI Production"
2. Tạo 4 tables: BrandProfile → Ideas → Scripts → Videos
3. Insert 1 record BrandProfile với data của bạn
4. Tạo views (Kanban, Grid, Gallery, Calendar)
5. Setup buttons trỏ tới n8n webhooks
6. Tạo Mobile Interface qua Interface Designer

Verify:
```bash
npm run test:airtable
```

---

### Phase 3 — VPS Setup (2-3h)

#### 3.1 Mua VPS
- Hetzner CX22 (~$5/tháng) hoặc DigitalOcean $12 droplet
- Specs: 2 vCPU, 4GB RAM, 40GB SSD
- OS: **Ubuntu 24.04 LTS**
- Region: gần user (Singapore/Tokyo cho VN)

#### 3.2 Trỏ DNS
Thêm A record:
```
n8n.yourdomain.com → <VPS_IP>
```
Đợi DNS propagate (~5-30 phút), kiểm tra: `dig n8n.yourdomain.com`

#### 3.3 SSH vào VPS
```bash
ssh root@<VPS_IP>
```

#### 3.4 Run setup script
```bash
# Trên local:
scp infra/setup-vps.sh root@<VPS_IP>:/root/
scp infra/docker-compose.yml root@<VPS_IP>:/opt/n8n/
scp infra/Caddyfile root@<VPS_IP>:/opt/n8n/

# Trên VPS:
bash /root/setup-vps.sh
```

Script sẽ in ra credentials → **LƯU NGAY** vào password manager.

#### 3.5 Tạo .env trên VPS
```bash
cd /opt/n8n
nano .env
```
Paste credentials từ output ở step 3.4. Format:
```
N8N_HOST=n8n.yourdomain.com
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<from-output>
N8N_ENCRYPTION_KEY=<from-output>
POSTGRES_PASSWORD=<from-output>
```

#### 3.6 Start
```bash
cd /opt/n8n
docker compose up -d
docker compose logs -f n8n  # check log, Ctrl+C khi thấy "Editor is now accessible"
```

#### 3.7 Truy cập
Mở browser: `https://n8n.yourdomain.com`
- Đợi ~30s lần đầu để Caddy lấy SSL cert
- Login với basic auth credentials
- Setup owner account

---

### Phase 4 — Import n8n Workflows (1h)

#### 4.1 Setup credentials trong n8n
n8n UI → Credentials → New:

**Anthropic:**
- Type: Anthropic API
- API Key: `<từ .env>`

**Airtable:**
- Type: Airtable Personal Access Token API
- Access Token: `<từ .env>`

#### 4.2 Setup environment variables
Settings → Environment variables → thêm tất cả vars từ `.env` (trừ N8N_*).

#### 4.3 Import 4 workflows
- Workflows → Import from File
- Upload từng file trong `n8n-workflows/`:
  1. `01-trend-crawler.json`
  2. `02-script-generator.json`
  3. `03-asset-generator.json`
  4. `04-publish.json`

#### 4.4 Activate webhooks
- Mở từng workflow → toggle **Active** ON
- Copy webhook URL từ node Webhook → paste vào button Airtable tương ứng

Webhook URLs:
- `https://n8n.yourdomain.com/webhook/generate-script` (Ideas.btn_generate_script)
- `https://n8n.yourdomain.com/webhook/generate-assets` (Scripts.btn_approve)
- `https://n8n.yourdomain.com/webhook/publish-video` (Videos.btn_approve)

#### 4.5 Test end-to-end
1. Insert 1 record vào Ideas table với title "[TEST] My first video"
2. Bấm `btn_generate_script`
3. Đợi 30s → check Scripts table có record mới
4. Review script, bấm `btn_approve`
5. Đợi 5-10 phút → check Videos table có record với `final_url`
6. Mở `final_url` → xem video
7. Bấm Approve → check Buffer dashboard

---

### Phase 5 — Polish (Tuần 2)

- [ ] Setup error notifications (n8n → Telegram bot khi workflow fail)
- [ ] Tinh chỉnh Claude prompt sau 5 video đầu (script chưa đúng tone)
- [ ] Tạo Submagic template riêng với intro/outro của bạn
- [ ] Setup VPS backup (snapshot weekly)
- [ ] Document daily routine (5 phút buổi sáng + 5 phút chiều)

---

## Daily Workflow (sau khi setup xong)

```
Sáng (10 phút):
1. Mở Airtable mobile → Idea Pool (Kanban)
2. Tick 2-3 idea → bấm Generate Script
3. Đợi script render → review trên app

Trưa (5 phút):
4. Approve script → đợi 10 phút render video

Chiều (10 phút):
5. Mở Mobile Review interface → swipe qua video pending
6. Approve & schedule

→ Buffer auto post theo lịch
```

---

## Troubleshooting

### `npm run test:claude` báo 401
- Check `ANTHROPIC_API_KEY` có đúng format `sk-ant-...`

### `npm run test:elevenlabs` báo voice not found
- Vào ElevenLabs → Voice Lab → copy đúng voice_id (string dài 20 chars)

### n8n không nhận webhook từ Airtable
- Check workflow Active = ON
- Check webhook URL trong button đúng (HTTPS, không slash thừa)
- n8n logs: `docker compose logs n8n -f`

### Video render fail ở Submagic
- Submagic free tier giới hạn 10 video/tháng — upgrade plan
- Check format assets: voice phải MP3, avatar phải MP4 9:16, b-roll phải URL public

### Avatar lipsync lệch
- Argil yêu cầu video gốc rõ miệng + audio sạch khi training
- Re-train với data tốt hơn

---

## Cost Estimate (40 video/tháng)

| Service | Plan | $/tháng |
|---------|------|---------|
| VPS (Hetzner CX22) | Self-host | $5 |
| Anthropic Claude | Pay-as-you-go | $30-50 |
| ElevenLabs | Creator | $22 |
| Argil | Pro | $39-89 |
| Apify | Starter | $30 |
| Pexels | Free | $0 |
| Submagic | Pro | $25 |
| Airtable | Free | $0 |
| Buffer | Essentials | $15 |
| **Total** | | **~$165-230** |

(Veo 3 thêm $50-100 nếu cần generative b-roll)

---

## Next Step

Sau khi setup xong và test 1 video end-to-end → đọc `BRAINSTORM_REPORT.md` mục **Roadmap 4 Tuần** để biết cách iterate.
