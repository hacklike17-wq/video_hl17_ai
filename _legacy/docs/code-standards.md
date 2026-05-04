# Code Standards & Conventions

**Last updated:** 2026-05-03
**Scope:** api-tests scripts, n8n workflow authoring, Airtable schema, env vars, secrets

---

## 1. Node.js / ESM (api-tests/)

### Module format
- All files use `.mjs` extension — native ESM, no transpilation
- `"type": "module"` in `package.json` — no CommonJS `require()`
- Import paths must include file extension: `import { log } from "./_lib.mjs"`

### Env vars
- Load via `import "dotenv/config"` at top of `_lib.mjs` — no explicit `dotenv.config()` call elsewhere
- Access as `process.env.VAR_NAME`
- Use `require_env("KEY1", "KEY2")` from `_lib.mjs` at the top of `main()` — throws immediately if any key is missing

### Error handling
- Each test file has a single `async function main()` wrapped in `.catch((e) => { fail(LABEL, e); process.exit(1) })`
- Never swallow errors silently; `fail()` prints in red to stdout
- `DEBUG=1` in env enables stack trace output from `fail()`

### Logging conventions (from `_lib.mjs`)
```js
log(LABEL, "informational step")   // blue  [label] msg
ok(LABEL, "success message")       // green ✓ [label] msg
fail(LABEL, error)                 // red   ✗ [label] msg
warn(LABEL, "non-fatal warning")   // yellow ⚠ [label] msg
```
`LABEL` is a lowercase string matching the API name: `"claude"`, `"elevenlabs"`, `"airtable"`, etc.

### File output
- Test artifacts go to `api-tests/output/` (created by `_lib.mjs` if absent)
- Use `saveOutput(filename, data)` — handles Buffer, Uint8Array, string, or JSON-serializable
- Add `api-tests/output/` to `.gitignore`

### HTTP requests
- Use `fetchJSON(url, opts)` from `_lib.mjs` for JSON APIs — handles non-2xx as thrown Error with `.status` and `.body`
- Use native `fetch()` directly when response is binary (audio, video) — see `test-elevenlabs.mjs`

### Node version
- Requires Node >=20 (native `fetch`, `.arrayBuffer()`)
- Declared in `package.json` `engines.node`

### Dependencies
- Runtime: `@anthropic-ai/sdk ^0.30.0`, `dotenv ^16.4.5`
- No other dependencies — use native `fetch` for all other APIs

---

## 2. n8n Workflow Conventions

### Naming
- Workflow names: `NN — Description (trigger-type)` — e.g. `"01 — Trend Crawler (cron 4h)"`
- Node names: human-readable verb phrases — `"Get Idea Record"`, `"Insert Script to Airtable"`, `"Pick Best B-roll"`
- Node IDs: kebab-case unique identifiers matching role — `"get-idea"`, `"filter-views"`, `"parse-json"`

### Environment variables in workflows
- Reference as `{{ $env.VAR_NAME }}` (expression syntax)
- Never hardcode API keys, base IDs, or URLs that should be configurable
- All external service keys must be in n8n Settings → Environment Variables (not workflow JSON)
- n8n credentials (Anthropic, Airtable) use n8n's built-in credential store — referenced by `credentials` block with `id` + `name`

### Credentials pattern
```json
"credentials": {
  "anthropicApi": { "id": "anthropic-credential", "name": "Anthropic" },
  "airtableTokenApi": { "id": "airtable-credential", "name": "Airtable" }
}
```
Credential `id` must match the ID assigned in n8n UI after creation.

### Airtable node usage
- Type: `n8n-nodes-base.airtable`, version `2.1`
- Base ID: always `={{ $env.AIRTABLE_BASE_ID }}` (never hardcoded)
- Table: use `"mode": "name"` with the table name string (e.g. `"Ideas"`)

### Claude / LLM nodes
- Type: `@n8n/n8n-nodes-langchain.lmChatAnthropic`
- Always specify `"model": "claude-sonnet-4-6"` explicitly
- Script generation: `temperature: 0.7`, `maxTokens: 2000`
- Scoring/classification: `temperature: 0.3`, `maxTokens: 300`
- LLM output is always parsed in a downstream Code node — never trust raw text directly

### JSON parsing in Code nodes
- Strip potential markdown code fences before `JSON.parse()`:
  ```js
  const clean = raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(clean);
  ```
- Wrap in try/catch; return error-state record or throw to fail the execution visibly

### Webhook pattern
- Trigger node: `"responseMode": "responseNode"` — always respond explicitly
- Respond node: returns `{ ok: true, ...relevant_ids }` on success
- Webhook paths are stable identifiers: `generate-script`, `generate-assets`, `publish-video`
- Path `submagic-done` is reserved for Submagic render callback (not yet implemented)

### Workflow file format
- Exported as JSON from n8n
- Keep `"settings": { "executionOrder": "v1" }` — do not upgrade unless testing
- Node positions (`position: [x, y]`) are cosmetic; maintain approximate left-to-right layout

---

## 3. Airtable Schema Conventions

### Table naming
- PascalCase: `BrandProfile`, `Ideas`, `Scripts`, `Videos`
- Singular noun

### Field naming
- snake_case: `source_platform`, `view_count`, `broll_prompts`, `submagic_project_id`
- Button fields: `btn_` prefix — `btn_generate_script`, `btn_approve`, `btn_reject`, `btn_regenerate`
- Timestamp fields: `_at` suffix for user-controlled times (`scheduled_at`, `published_at`), `_date` for content metadata (`posted_date`, `crawled_date`)
- Auto-created timestamps: use Airtable native `createdTime` type for `crawled_date`, `created_at`

### Status field enums

**Ideas.status:**
`Idea` → `Approved` → `Script Gen` → `Done` | `Rejected`

**Scripts.status:**
`Draft` → `Pending Review` → `Approved` → `Rendering` → `Done` | `Rejected`

**Videos.status:**
`Rendering` → `Pending Review` → `Approved` → `Scheduled` → `Published` | `Rejected`

Status values are Title Case single-select strings — match exactly when filtering or setting via API.

### Linked records
- `Ideas` ↔ `Scripts`: linked via `idea_id` field in Scripts
- `Scripts` ↔ `Videos`: linked via `script_id` field in Videos
- `BrandProfile` is read (not linked) by n8n at script generation time — no formal link

### Formula fields
- `Scripts.title`: `{idea_id} & " v" & {version}` — requires linked field to exist first
- `Videos.title`: `{script_id}` — derives from linked script

### Buttons
- Type: "Open URL" or "Run script" (Airtable Scripting)
- URL pattern: `https://n8n.yourdomain.com/webhook/<path>?recordId={RECORD_ID()}`
- POST pattern (Run script): fetch with `method: "POST"`, JSON body `{ recordId }`

### JSON stored as text
- `broll_prompts`: stored as JSON string (`JSON.stringify(array)`) in a Long Text field
- Parsed by downstream n8n Code node with `JSON.parse()`
- `hook_examples`, `script_examples`, `signature_phrases`, `forbidden_phrases`: plain multiline text (one item per line convention)

---

## 4. Environment Variable Naming

All vars use `SCREAMING_SNAKE_CASE`.

| Prefix | Service |
|--------|---------|
| `ANTHROPIC_` | Claude / Anthropic API |
| `CLAUDE_` | Claude model config (e.g. `CLAUDE_MODEL`) |
| `ELEVENLABS_` | ElevenLabs API + resource IDs |
| `ARGIL_` | Argil API + resource IDs |
| `APIFY_` | Apify token + actor IDs |
| `PEXELS_` | Pexels API |
| `SUBMAGIC_` | Submagic API + template IDs |
| `AIRTABLE_` | Airtable PAT, base ID, table names |
| `BUFFER_` | Buffer access token |
| `N8N_` | n8n infrastructure (host, auth, encryption) |
| `POSTGRES_` | Postgres credentials (VPS only) |
| `WEBHOOK_URL` | n8n public URL (used inside workflows as base for callback URLs) |

Two `.env.example` files exist:
- `/.env.example` — local dev (all API keys + n8n vars)
- `/infra/.env.example` — VPS-only (N8N_HOST, N8N_BASIC_AUTH_*, N8N_ENCRYPTION_KEY, POSTGRES_PASSWORD)

On VPS, n8n environment variables are set via n8n UI (Settings → Environment Variables), not `.env` file, for keys referenced inside workflows.

---

## 5. Language / Documentation Style

- **Technical files** (this repo, docs): English
- **User-facing strings** (Airtable UI labels, Vietnamese-language scripts, UI mockup): Vietnamese
- **n8n workflow comments / node descriptions**: English
- **Script content** generated by Claude: Vietnamese (`tiếng Việt`) with occasional English tech terms
- LLM prompts in n8n workflows: Vietnamese (matching the system prompt in `02-script-generator.json`)

---

## 6. Secret Handling

- Never commit `.env` — add to `.gitignore`
- Never commit `infra/.env` — add to `.gitignore`
- Generate strong secrets with: `openssl rand -hex 32` (encryption keys) or `openssl rand -base64 24` (passwords)
- `infra/setup-vps.sh` auto-generates `N8N_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`, `N8N_BASIC_AUTH_PASSWORD` and prints them once — save immediately to a password manager
- API keys go into password manager; populate `.env` from there
- n8n credentials are stored encrypted in Postgres using `N8N_ENCRYPTION_KEY` — back up `/opt/n8n/n8n_data/` on VPS
- `api-tests/output/` may contain generated audio/JSON — add to `.gitignore`

### Recommended `.gitignore` additions
```
.env
infra/.env
api-tests/output/
node_modules/
```
