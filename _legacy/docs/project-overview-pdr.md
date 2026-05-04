# Project Overview & Product Development Requirements

**Last updated:** 2026-05-03
**Source of truth:** [`BRAINSTORM_REPORT.md`](../BRAINSTORM_REPORT.md)

---

## 1. Problem Statement

Solo creator needs a semi-automated system to produce ~10 short-form videos/week (<60s, TikTok/Reels) that:

1. Mines trending content ideas from social platforms
2. Generates scripts in the creator's personal voice
3. Renders hybrid video: AI avatar talking-head (hook/payoff) + voiceover over b-roll (body)
4. Gates every video behind human review before publish
5. Stays modular — swap or add API vendors without rebuilding

**Core constraints:**
- Solo / small team, no ML engineer
- Quality > quantity — AI slop or watermarked content kills the channel
- Brand Profile must stay consistent: same face, voice, visual style across all videos

---

## 2. Target User

Single creator ("Henry") managing a personal brand on TikTok/Instagram/YouTube Shorts in Vietnamese, covering pillars: Tech, AI, Productivity, Indie Hacking.

**Not** a multi-tenant SaaS. Multi-brand support is a Phase B concern.

---

## 3. Scope

### In-scope (Phase A — current)
- Automated trend crawling (Apify → Airtable Ideas)
- AI script generation (Claude → Airtable Scripts)
- Asset generation: voice (ElevenLabs), avatar (Argil), b-roll (Pexels)
- Video assembly with captions (Submagic)
- Human review dashboard (Airtable views + Interface Designer)
- Scheduled publish (Buffer)
- n8n self-hosted orchestration on VPS
- 1 brand profile, 1 creator

### Out of scope (Phase A)
- Custom web application frontend
- Multi-brand or team accounts
- Self-hosted AI models
- Direct social API posting (Buffer handles this)
- Analytics dashboard beyond Airtable views
- Direct TikTok/IG scraping (use Apify)

---

## 4. Non-Goals

- Do not build a video editing UI — Submagic handles assembly
- Do not self-host voice or avatar models — API quality exceeds self-hosted for current scale
- Do not automate around the human review gate — this is intentional quality control

---

## 5. Success Metrics

### Operational
| Metric | Target |
|--------|--------|
| Time per video (active human work) | <15 min |
| Cost per video | <$10 |
| Pipeline execution success rate | >90% |
| Script approve rate at review gate | >70% |

### Content performance
| Metric | Signal |
|--------|--------|
| Hook retention (3s, 10s) | vs. baseline manual |
| Average view rate | tracked per video in Airtable |
| Follower growth rate | monthly delta |

### Business
- Monetization/lead generation eligibility (tracked manually)

---

## 6. Roadmap

### Phase A — n8n + APIs (current, 4 weeks)

| Week | Focus | Key tasks |
|------|-------|-----------|
| 1 | Foundation | VPS up, Airtable schema, voice clone, avatar clone, all 8 API tests passing |
| 2 | Pipeline | Import 4 n8n workflows, prompt-engineer script generator, first end-to-end video |
| 3 | Idea mining + review | Apify cron live, Airtable review dashboard, Buffer connected |
| 4 | Iterate | 10 real videos produced, metrics captured, prompt/template refinement |

### Phase A.5 — Polish (after Week 4)
- Error notifications via Telegram bot (n8n → Telegram on workflow failure)
- Submagic custom template with intro/outro
- VPS weekly snapshot backup
- Documented daily routine

### Phase B — Hybrid Web App (trigger when ready)
Upgrade triggers (from `BRAINSTORM_REPORT.md` §Appendix):
- Volume > 20 videos/week (n8n UI bottleneck)
- Multi-brand needed (>2 brands)
- Team > 2 reviewers
- Need custom analytics dashboard
- External clients want self-serve

Phase B adds: Next.js frontend, Postgres replacing Airtable as primary DB, proper auth.

---

## 7. Cost Model

Monthly costs at 40 videos/month:

| Service | Plan | $/mo |
|---------|------|------|
| VPS (Hetzner CX22) | Self-host | $5 |
| Anthropic Claude | Pay-as-you-go | $30–50 |
| ElevenLabs | Creator | $22 |
| Argil | Pro | $39–89 |
| Apify | Starter | $30 |
| Pexels | Free | $0 |
| Submagic | Pro | $25 |
| Airtable | Free | $0 |
| Buffer | Essentials | $15 |
| **Total** | | **$165–230** |
| + Veo 3 (optional) | Pay-per-use | +$50–100 |

Cost per video: ~$4–6 at 40/month.

> BRAINSTORM_REPORT.md §2 cites $250–400/month — this includes Veo 3 generative b-roll usage. SETUP.md §Cost shows $165–230 baseline (Veo excluded). Both figures are correct for different usage profiles.

---

## 8. Risk Register

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Vendor price change or API shutdown | High | n8n abstraction — each service lives in exactly one node; swap node, not architecture |
| TikTok/YouTube AI content penalties | High | Mandatory human review, personal voice/signature phrases, limit avatar to 25–30% of video |
| Avatar uncanny valley | Medium | Avatar only on hook (0–3s) and payoff (35–50s); body is b-roll voiceover |
| Voice/avatar quality regression after re-training | Medium | Keep original training data; only re-train from scratch with new clean source material |
| Apify rate-limit or ToS change | Medium | Apify abstracts the scraping risk; cache results 24h in Airtable to avoid re-runs |
| Cost escalation at scale | Medium | Veo 3 on-demand only; aggressively reuse cached b-roll; Pexels covers 90% |
| Idea duplication / plagiarism | Low–Med | Claude similarity check against last 50 video ideas before scoring |
| VPS downtime affecting webhook delivery | Low | Airtable automations can retry; execution logs in n8n for rerun |

---

## 9. Architecture Decision Record (summary)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Orchestration | n8n self-hosted | Open source, no vendor lock-in, visual debuggability, easy node swap |
| DB / review UI | Airtable | Free tier, powerful views, mobile app, button-triggered webhooks |
| LLM | Claude Sonnet 4.6 | Best Vietnamese tone retention, prompt caching available |
| Avatar | Argil (HeyGen backup) | Better Vietnamese lip-sync 2026, cheaper, API stable |
| Assembly | Submagic | Auto-caption in Vietnamese, viral templates |
| No self-hosted models | — | 3–6 month build time, inferior quality vs. commercial APIs at this scale |
| Human review is mandatory | — | Non-negotiable quality gate; skip = risk of AI slop penalty |
