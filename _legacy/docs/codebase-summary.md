# Codebase Summary

**Last updated:** 2026-05-03

This is an **integration project**, not an application codebase. There is no server process to run locally. n8n is the runtime; the files here are configuration, workflow definitions, and connectivity test scripts.

---

## Directory Map

```
video_ai/
├── BRAINSTORM_REPORT.md        design rationale, architecture decisions, cost model
├── README.md                   quick start, pipeline diagram, stack list
├── SETUP.md                    5-phase setup guide (local → VPS → n8n → test)
├── package.json                Node.js project manifest (ESM, Node >=20)
├── .env.example                env var template — copy to .env and fill
│
├── infra/                      VPS deployment artifacts
│   ├── docker-compose.yml      defines 3 services: postgres, n8n, caddy
│   ├── Caddyfile               reverse proxy + TLS config for n8n
│   ├── setup-vps.sh            one-time Ubuntu 24.04 init (Docker, UFW, generates secrets)
│   └── .env.example            VPS-only env vars (N8N_HOST, auth, encryption key)
│
├── n8n-workflows/              JSON workflow definitions — import into n8n UI
│   ├── 01-trend-crawler.json     cron every 4h
│   ├── 02-script-generator.json  webhook /generate-script
│   ├── 03-asset-generator.json   webhook /generate-assets, async kick-off
│   ├── 04-publish.json           webhook /publish-video
│   ├── 05-argil-callback.json    webhook /argil-done (provider callback)
│   └── 06-submagic-callback.json webhook /submagic-done (provider callback)
│
├── airtable-schema/            Airtable setup specification
│   ├── schema.json             machine-readable field/view/automation spec
│   └── SETUP_AIRTABLE.md       human-readable step-by-step (tables, buttons, views)
│
├── api-tests/                  Node.js ESM connectivity probes
│   ├── _lib.mjs                shared utilities (log/ok/fail, require_env, fetchJSON, saveOutput)
│   ├── run-all.mjs             sequential test runner with pass/fail summary
│   ├── test-claude.mjs         generate a sample script via Anthropic SDK
│   ├── test-elevenlabs.mjs     synthesize speech, save .mp3
│   ├── test-argil.mjs          list available avatars/voices
│   ├── test-apify.mjs          scrape 5 TikTok videos by hashtag
│   ├── test-pexels.mjs         search portrait b-roll clips
│   ├── test-submagic.mjs       API auth check
│   ├── test-airtable.mjs       schema check + insert/delete test record
│   └── test-buffer.mjs         list connected social channels
│
├── ui-mockup/
│   └── index.html              static HTML/CSS mockup of review dashboard (no JS backend)
│
└── docs/                       technical reference documentation
    ├── project-overview-pdr.md  requirements, roadmap, risk register, cost model
    ├── codebase-summary.md      this file
    ├── code-standards.md        conventions: Node.js/ESM, n8n, Airtable, env vars
    └── system-architecture.md   data flow, component matrix, deployment topology
```

---

## File Classification by Lifecycle

| Artifact | When used | Who reads/writes |
|----------|-----------|-----------------|
| `BRAINSTORM_REPORT.md` | Design phase, ongoing reference | Creator + any collaborator |
| `SETUP.md` | One-time onboarding | Person setting up the system |
| `.env.example` | Setup time | Developer copies → `.env` |
| `infra/setup-vps.sh` | One-time VPS provisioning | sysadmin / creator |
| `infra/docker-compose.yml` | VPS startup, service updates | Docker on VPS |
| `infra/Caddyfile` | Running — Caddy reads at boot | Caddy container |
| `n8n-workflows/*.json` | Import once, then n8n owns them | n8n UI (import/export) |
| `airtable-schema/schema.json` | Setup time, reference | Developer creating tables |
| `airtable-schema/SETUP_AIRTABLE.md` | One-time Airtable setup | Creator |
| `api-tests/*.mjs` | Dev time — validate credentials | Developer (npm run test:*) |
| `api-tests/output/` | Test artifacts (gitignored) | Dev inspection only |
| `ui-mockup/index.html` | Design/UX reference | Creator, not deployed |
| `package.json` | Dev time (running tests) | npm |

---

## n8n Workflows Detail

### `01-trend-crawler.json` — Cron, every 4h
**Nodes:** Schedule Trigger → Set Hashtags → Apify TikTok Scraper (HTTP POST) → Split Items → Filter ≥50K views → Claude Score & Classify → Format for Airtable → Insert to Airtable (Ideas)

- Hashtags hardcoded in Set node: `ai, claudecode, buildinpublic, aitools, productivity`
- Claude response: `{ score: 1–10, pillar: "Tech|AI|Productivity|Other", angle: "..." }`
- Writes to: `Ideas` table, fields: `title, hook_text, source_url, source_platform, view_count, posted_date, pillar, score, angle, status="Idea"`

### `02-script-generator.json` — Webhook `POST /webhook/generate-script`
**Trigger:** Airtable `Ideas.btn_generate_script` button
**Input:** `{ recordId: string }`
**Nodes:** Webhook → [Get Idea Record ‖ Get Brand Profile] → Merge → Claude Generate Script → Parse Script JSON → Insert Script to Airtable (Scripts) → Mark Idea status="Script Gen" → Respond

- Claude receives full BrandProfile from Airtable (voice_style, signature_phrases, hook_examples)
- Output script fields: `hook, setup, body, payoff, cta, broll_prompts` (JSON array)
- Script saved with `status="Pending Review"`
- Returns `{ ok: true, script_id: "..." }`

### `03-asset-generator.json` — Webhook `POST /webhook/generate-assets`
**Trigger:** Airtable `Scripts.btn_approve` button
**Input:** `{ scriptId: string }`
**Behavior:** Async kick-off only — does NOT wait for Argil/Submagic to finish.

**Nodes:** Webhook → Get Script → Create Video Record (placeholder, status="Generating Assets") → 3 parallel branches:
- ElevenLabs (sync) → Cloudinary Upload → `voice_url`
- Argil POST with `webhookUrl` callback (async) → returns `argil_job_id`
- Expand B-roll → Pexels Search → Pick Best → `broll_urls`

→ Merge → Build State Payload → Save Async State to Videos → Respond `{ video_id, status: "awaiting_argil" }`

The Argil callback will fire later, triggering workflow 05.

### `04-publish.json` — Webhook `POST /webhook/publish-video`
**Trigger:** Airtable `Videos.btn_approve` button
**Input:** `{ videoId: string }`
**Nodes:** Webhook → Get Video Record → Get Buffer Profiles → Filter Target Channels (TikTok/Instagram/YouTube) → Schedule on Buffer → Mark Video status="Scheduled" → Respond

- Uses Buffer API v2 (`bufferapp.com/2/updates/create.json`) with form-urlencoded body
- Posts to all matching channels in one run (fan-out per channel)

### `05-argil-callback.json` — Webhook `POST /webhook/argil-done?videoId=X`
**Trigger:** Argil POSTs when avatar render completes
**Input:** Argil-defined payload (`id, status, videoUrl/url`) + `videoId` query param
**Nodes:** Webhook → Parse Argil Payload → Render Succeeded? → IF success: Save Avatar URL → Reload Video → Submagic POST (with `webhook` field for next callback) → Save Submagic Project ID → Respond. ELSE: Mark Failed.

- Bridges async Argil → Submagic kick-off
- Submagic POST includes `webhook: WEBHOOK_URL/webhook/submagic-done?videoId=X`

### `06-submagic-callback.json` — Webhook `POST /webhook/submagic-done?videoId=X`
**Trigger:** Submagic POSTs when assembly + caption render completes
**Input:** Submagic-defined payload (`id, status, output_url, thumbnail, duration`) + `videoId` query param
**Nodes:** Webhook → Parse Submagic Payload → Render Completed? → IF: Save Final URL → status="Pending Review". ELSE: Mark Failed.

- Final step in async chain — record is now ready for human review

---

## Airtable Schema Summary

4 tables, all in base **"Video AI Production"**:

| Table | Primary field | Row count intent | Key status values |
|-------|--------------|-----------------|-------------------|
| `BrandProfile` | name | 1 (single creator) | — |
| `Ideas` | title | Hundreds (auto-ingested) | Idea → Approved → Script Gen → Done / Rejected |
| `Scripts` | title (formula) | Dozens (per-idea) | Draft → Pending Review → Approved → Rendering → Done / Rejected |
| `Videos` | title (formula) | Tens (per-week batch) | Rendering → Pending Review → Approved → Scheduled → Published / Rejected |

Table relationships: `BrandProfile` ← (read-only reference) `Scripts`; `Ideas` ←→ `Scripts` (linked); `Scripts` ←→ `Videos` (linked)

---

## api-tests Output Files

Running tests writes to `api-tests/output/` (should be gitignored):

| File | Created by |
|------|-----------|
| `claude-script.json` | test-claude.mjs |
| `elevenlabs-voice.mp3` | test-elevenlabs.mjs |
| `argil-avatars.json` | test-argil.mjs |
| `apify-tiktoks.json` | test-apify.mjs |
| `pexels-results.json` | test-pexels.mjs |

---

## What Is NOT in This Repo

- n8n execution logs (stored in Postgres on VPS)
- Actual voice/avatar training data
- Rendered video files (URLs in Airtable; binaries managed by Submagic/Argil)
- Airtable records (live in cloud)
- `.env` (gitignored — never commit)
- `api-tests/output/` (generated files — gitignore recommended)
