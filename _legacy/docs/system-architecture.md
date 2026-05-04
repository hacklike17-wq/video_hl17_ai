# System Architecture

**Last updated:** 2026-05-03

---

## 1. Data Flow Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  TREND MINING  (automated, every 4h)                                 │
│                                                                      │
│  Apify TikTok Scraper  ──►  Claude (score + classify)               │
│      (≥50K views filter)         ↓                                  │
│                          Airtable: Ideas table                       │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Human picks ideas (Kanban view)
┌──────────────────────────────────▼───────────────────────────────────┐
│  SCRIPT GENERATION  (on-demand, webhook)                             │
│                                                                      │
│  Ideas.btn_generate_script  ──►  n8n webhook /generate-script       │
│                                      │                               │
│                          [Airtable: Ideas + BrandProfile]            │
│                                      ↓                               │
│                          Claude (script JSON: hook/setup/body/       │
│                                  payoff/cta/broll_prompts)           │
│                                      ↓                               │
│                          Airtable: Scripts table (Pending Review)    │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Human reviews script, approves
┌──────────────────────────────────▼───────────────────────────────────┐
│  ASSET GENERATION  (async, 3 webhook-driven stages)                  │
│                                                                      │
│  Stage 1: Kick-Off (workflow 03)                                     │
│    Scripts.btn_approve  ──►  /webhook/generate-assets               │
│                                      │                               │
│              ┌───────────────────────┼───────────────────────┐       │
│              ▼                       ▼                       ▼       │
│        ElevenLabs (sync)      Argil POST (async)       Pexels (sync) │
│              ↓                       ↓                       ↓       │
│        Cloudinary upload      Returns argil_job_id      clip URLs    │
│              ↓                       ↓                       ↓       │
│              └───────► Videos { voice_url, argil_job_id, broll_urls,  │
│                                  status: "Generating Assets" }       │
│                                                                      │
│  Stage 2: Argil Callback (workflow 05) — Argil POSTs when render done│
│    Argil ──► /webhook/argil-done?videoId=X                          │
│        ↓                                                             │
│    Update Videos.avatar_url = argil_url                              │
│        ↓                                                             │
│    Submagic POST (assemble all 3 asset URLs + caption)               │
│        ↓                                                             │
│    Videos { submagic_project_id, status: "Rendering" }               │
│                                                                      │
│  Stage 3: Submagic Callback (workflow 06) — Submagic POSTs on done   │
│    Submagic ──► /webhook/submagic-done?videoId=X                    │
│        ↓                                                             │
│    Videos { final_url, duration, status: "Pending Review" }          │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Human reviews video, approves
┌──────────────────────────────────▼───────────────────────────────────┐
│  PUBLISH  (on-demand, webhook)                                       │
│                                                                      │
│  Videos.btn_approve  ──►  n8n webhook /publish-video                │
│                                      │                               │
│                          Buffer API (schedule per platform)          │
│                          └── TikTok, Instagram, YouTube Shorts       │
│                                      ↓                               │
│                          Videos.status = "Scheduled"                 │
│                          (Buffer posts automatically at scheduled_at)│
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Video Structure (per video)

```
[0–3s]    HOOK     — Avatar talking-head (Argil clip 1)
[3–8s]    SETUP    — B-roll + voiceover (ElevenLabs)
[8–35s]   BODY     — B-roll + voiceover (ElevenLabs) + optional 2s avatar cuts
[35–50s]  PAYOFF   — Avatar talking-head (Argil clip 2)
[50–55s]  CTA      — Avatar + text overlay (Submagic caption)
```

Asset counts per video:
- 2 avatar clips (~15s total) — Argil
- 1 voiceover (~50s) — ElevenLabs, `eleven_multilingual_v2` model
- 8–12 b-roll clips (3–5s each) — Pexels (90%), Veo 3 (10% when stock unavailable)
- Auto-captions + music — Submagic, Vietnamese language

---

## 3. Component Responsibility Matrix

| Component | Type | Responsibility | Writes to |
|-----------|------|---------------|-----------|
| Apify | SaaS | TikTok trend scraping | n8n (HTTP response) |
| Claude (n8n node) | SaaS | Idea scoring, script generation | Airtable via n8n |
| ElevenLabs | SaaS | Voiceover synthesis (b-roll narration) | n8n binary → Cloudinary CDN |
| Cloudinary | SaaS | Public URL hosting for ElevenLabs MP3 | Cloudinary CDN → `voice_url` |
| Argil | SaaS | Avatar clip rendering (async, webhook callback) | Argil CDN → `avatar_url` |
| Pexels | SaaS | Stock b-roll search | n8n (HTTP response, clip URLs) |
| Veo 3 | SaaS (optional) | Generative b-roll when stock insufficient | Veo CDN → URL |
| Submagic | SaaS | Video assembly + captions + music | Submagic CDN → `final_url` |
| Buffer | SaaS | Multi-platform scheduling + posting | TikTok/IG/YT |
| **n8n** | Self-hosted | **All orchestration** — the only runtime | Airtable, calls all SaaS APIs |
| Airtable | SaaS | Metadata DB, human review UI, webhook triggers | Itself (records) |
| Caddy | Self-hosted | TLS termination + reverse proxy for n8n | Access logs |
| Postgres | Self-hosted | n8n state: workflows, credentials, execution history | Postgres data volume |

---

## 4. Webhook Chain

Two classes of webhooks:
- **Inbound from Airtable** — user-triggered (button clicks)
- **Inbound from SaaS providers** — async callbacks (Argil, Submagic finish render)

```
─── User-triggered (Airtable buttons) ───
Airtable button click → Caddy (TLS) → n8n Webhook node → workflow
                                                              ↓
                                                Airtable record updated

─── Provider callbacks (async) ───
Argil render completes
  └─► POST WEBHOOK_URL/webhook/argil-done?videoId=X
        ↓
      Workflow 05: save avatar_url → kick off Submagic
        ↓
Submagic render completes
  └─► POST WEBHOOK_URL/webhook/submagic-done?videoId=X
        ↓
      Workflow 06: save final_url → status "Pending Review"
```

### Webhook URLs

| Trigger | Webhook path | Payload | Workflow |
|---------|-------------|---------|----------|
| `Ideas.btn_generate_script` | `POST /webhook/generate-script` | `{ recordId }` | 02 |
| `Scripts.btn_approve` | `POST /webhook/generate-assets` | `{ scriptId }` | 03 |
| `Scripts.btn_regenerate` | `POST /webhook/generate-script` | `{ recordId, regenerate: true }` | 02 |
| Argil callback | `POST /webhook/argil-done?videoId=X` | `{ id, status, videoUrl }` (provider-specific) | 05 |
| Submagic callback | `POST /webhook/submagic-done?videoId=X` | `{ id, status, output_url }` (provider-specific) | 06 |
| `Videos.btn_approve` | `POST /webhook/publish-video` | `{ videoId }` | 04 |

The `videoId` query string is passed to provider callbacks because providers may not echo back arbitrary metadata; the workflow uses it to look up the correct Airtable record.

---

## 5. Trust Boundaries & Secret Locations

```
┌─────────────────────────────────────┐
│  LOCAL LAPTOP (dev only)            │
│  .env — all API keys for testing    │
│  api-tests/*.mjs — reads .env       │
│  No production secrets used here    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  VPS — /opt/n8n/                    │
│  .env (N8N_*, POSTGRES_*)           │
│  n8n Settings → Env Vars            │
│    (API keys injected into n8n)     │
│  n8n Credentials store              │
│    (Anthropic, Airtable — encrypted │
│     in Postgres by N8N_ENCRYPTION_  │
│     KEY)                            │
│  Postgres — n8n state + cred cipher │
│  /opt/n8n/n8n_data/ — backup this  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  SaaS (cloud, external)             │
│  Airtable — metadata + review UI   │
│  Argil — avatar model + CDN         │
│  ElevenLabs — voice model + CDN     │
│  Submagic — final video CDN         │
│  Buffer — social account tokens     │
└─────────────────────────────────────┘
```

n8n is the **only component that holds all API keys simultaneously**. It calls each SaaS service using its stored credentials. Airtable never calls other SaaS services directly — it only triggers n8n webhooks.

---

## 6. Storage Architecture

| Data type | Where stored | Durability |
|-----------|-------------|-----------|
| Idea metadata | Airtable `Ideas` table | Cloud, persistent |
| Script content | Airtable `Scripts` table | Cloud, persistent |
| Video metadata + URLs | Airtable `Videos` table | Cloud, persistent |
| Brand profile | Airtable `BrandProfile` table | Cloud, persistent |
| n8n workflow definitions | Postgres (VPS) + JSON files in repo | VPS + git |
| n8n execution history | Postgres (VPS), pruned after 168h | Ephemeral |
| n8n credentials (encrypted) | Postgres (VPS) | VPS (back up n8n_data/) |
| Generated voice audio | n8n binary filesystem (`/files`) → used as temp | Ephemeral (not persisted long-term) |
| Argil avatar clips | Argil CDN | Argil-managed, URL in Airtable |
| Final video file | Submagic CDN | Submagic-managed, `final_url` in Airtable |
| B-roll clips | Pexels CDN (URLs only, no download) | Pexels-managed |
| Test output artifacts | `api-tests/output/` (local) | Dev machine only |

---

## 7. Deployment Topology

```
┌──────────────────────────────────────────────────────────────────┐
│  LOCAL LAPTOP                                                    │
│  ├── Development: editing workflow JSON, writing test scripts    │
│  ├── Testing: npm run test:* (reads local .env)                  │
│  └── UI preview: open ui-mockup/index.html                       │
└──────────────────────────────────────────────────────────────────┘
                         │  scp workflow files + docker-compose
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  VPS — Hetzner CX22 ($5/mo) or DigitalOcean $12 Droplet         │
│  Ubuntu 24.04 LTS, 2 vCPU, 4GB RAM, 40GB SSD                    │
│  Firewall: UFW (22, 80, 443 only)                                │
│  fail2ban: SSH brute-force protection                            │
│  DNS: n8n.yourdomain.com → VPS IP (A record)                    │
│                                                                  │
│  docker compose stack (/opt/n8n/):                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                     │
│  │  Caddy   │   │   n8n    │   │ Postgres │                     │
│  │ :80/:443 │──►│  :5678   │──►│  :5432   │                     │
│  │ TLS/SSL  │   │ workflows│   │  n8n DB  │                     │
│  └──────────┘   └──────────┘   └──────────┘                     │
│                                                                  │
│  Volumes:                                                        │
│  ./caddy_data, ./caddy_config — TLS certs                        │
│  ./n8n_data — workflow/credential store                          │
│  ./n8n_files — binary file storage                               │
│  ./postgres_data — n8n state DB                                  │
└──────────────────────────────────────────────────────────────────┘
                         │  webhook calls, API requests
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  SaaS Cloud Services                                             │
│  Airtable · ElevenLabs · Argil · Apify · Pexels · Submagic       │
│  Buffer · Anthropic (Claude) · [optional: Veo 3]                 │
└──────────────────────────────────────────────────────────────────┘
                         │  reads/writes via mobile + web
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  CREATOR (human-in-the-loop)                                     │
│  Airtable web app or mobile app for:                             │
│  - Reviewing idea pool (Kanban)                                  │
│  - Approving scripts                                             │
│  - Reviewing + scheduling videos (Gallery / Interface Designer)  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Known Gaps / TODOs

| Gap | Location | Impact |
|-----|----------|--------|
| `btn_regenerate` handler not separate from `generate-script` | `02-script-generator.json` | Regenerate path needs `regenerate: true` flag handling in workflow logic |
| Webhook payload shapes assumed | `05-argil-callback.json`, `06-submagic-callback.json` | Parse nodes guess field names (`videoUrl`/`url`/`output_url`). Verify against actual provider docs on first real run |
| No error notification | All workflows | Workflow failures are silent unless operator checks n8n logs. TODO: Telegram/email alert node on workflow `errorTrigger` |
| Cloudinary upload preset must be **unsigned** | `03-asset-generator.json` Cloudinary node | Signed presets need extra params (timestamp, signature). Use unsigned for simplicity |
| No deduplication for Apify crawler | `01-trend-crawler.json` | Same TikTok video can be inserted twice on consecutive crawls. Add dedup by `source_url` |
