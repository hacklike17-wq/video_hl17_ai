# Airtable Setup — Step by Step

Airtable không hỗ trợ import schema từ JSON cho free plan. Bạn cần tạo tables manually theo spec dưới (~30 phút).

## Step 1: Tạo Base mới

1. Vào https://airtable.com → "Add a base" → Start from scratch
2. Đặt tên: **"Video AI Production"**
3. Note lại `Base ID` (URL có dạng `https://airtable.com/appXXXXXXXXX/...` → `appXXXXXXXXX`)

## Step 2: Tạo Personal Access Token

1. https://airtable.com/create/tokens → Create new token
2. Scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
3. Access: chỉ base "Video AI Production"
4. Copy token → paste vào `.env` → `AIRTABLE_API_KEY`

## Step 3: Tạo 4 Tables

Xóa Table 1 default. Tạo 4 table theo thứ tự:

### 3.1 Table: BrandProfile (tạo TRƯỚC)
Vì các table sau link tới đây.

| Field | Type | Notes |
|-------|------|-------|
| name | Single line text | Primary |
| voice_id_elevenlabs | Single line text | |
| avatar_id_argil | Single line text | |
| voice_id_argil | Single line text | |
| voice_style | Long text | "Casual, energetic Vietnamese..." |
| signature_phrases | Long text | "Thật ra thì..., Nói thẳng nha" |
| content_pillars | Long text | "Tech, AI, Productivity" |
| banned_topics | Long text | "Politics, Religion, Crypto" |
| primary_color | Single line text | "#FF6B35" |
| submagic_template_id | Single line text | |
| hook_examples | Long text | 20 dòng hook viral |
| script_examples | Long text | 5 script mẫu |
| default_cta | Single line text | "Follow để xem thêm" |

**Insert 1 record** ngay với data của bạn → note `recordId` sau khi tạo.

### 3.2 Table: Ideas

| Field | Type | Options |
|-------|------|---------|
| title | Single line text | Primary |
| hook_text | Long text | |
| source_url | URL | |
| source_platform | Single select | tiktok, youtube, instagram, twitter, manual |
| view_count | Number | Integer |
| posted_date | Date | Include time |
| crawled_date | Created time | |
| pillar | Single select | Tech, AI, Productivity, Indie Hacking, Other |
| score | Number | Decimal |
| angle | Long text | |
| status | Single select | Idea, Approved, Script Gen, Done, Rejected |
| btn_generate_script | Button | See **Button Setup** below |

### 3.3 Table: Scripts

| Field | Type | Options |
|-------|------|---------|
| title | Formula | `{idea_id} & " v" & {version}` (sau khi linked field tạo xong) |
| idea_id | Link to Ideas | |
| hook | Long text | |
| setup | Long text | |
| body | Long text | |
| payoff | Long text | |
| cta | Long text | |
| broll_prompts | Long text | |
| version | Number | Integer, default 1 |
| status | Single select | Draft, Pending Review, Approved, Rendering, Done, Rejected |
| created_at | Created time | |
| btn_approve | Button | Webhook |
| btn_regenerate | Button | Webhook |

### 3.4 Table: Videos

| Field | Type | Options |
|-------|------|---------|
| title | Formula | `{script_id}` |
| script_id | Link to Scripts | |
| argil_job_id | Single line text | Set by workflow 03, looked up by workflow 05 |
| submagic_project_id | Single line text | Set by workflow 05 |
| voice_url | URL | Cloudinary-hosted MP3 |
| avatar_url | URL | Argil output, set by workflow 05 |
| broll_urls | Long text | JSON array |
| final_url | URL | Submagic output, set by workflow 06 |
| thumbnail | Attachment | |
| duration | Number | |
| caption | Long text | |
| status | Single select | Generating Assets, Assembling, Rendering, Pending Review, Approved, Scheduled, Published, Rejected, Argil Failed, Submagic Failed |
| reject_reason | Long text | |
| scheduled_at | Date | Include time |
| published_at | Date | Include time |
| platforms | Multiple select | TikTok, Instagram, YouTube Shorts |
| btn_approve | Button | Webhook |
| btn_reject | Button | Run script (set status = Rejected) |

## Step 4: Button Setup (n8n webhooks)

Mỗi button trong Airtable → "Open URL" type → URL format:

**Ideas.btn_generate_script:**
```
https://n8n.yourdomain.com/webhook/generate-script?recordId={RECORD_ID()}
```

Hoặc dùng "Run script" type với code:
```javascript
const recordId = base.getTable("Ideas").getRecord(input.config().recordId).id;
await fetch("https://n8n.yourdomain.com/webhook/generate-script", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ recordId })
});
output.markdown("✓ Script generation triggered");
```

**Scripts.btn_approve:** trỏ tới `/webhook/generate-assets` với `scriptId`
**Videos.btn_approve:** trỏ tới `/webhook/publish-video` với `videoId`

## Step 5: Views

### Ideas views:
- **Idea Pool** (Kanban, group by `status`)
- **Top Ideas** (Grid, filter `score >= 8 AND status = "Idea"`, sort `score DESC`)

### Scripts views:
- **Pending Review** (Grid, filter `status = "Pending Review"`)
- **All** (Grid)

### Videos views:
- **Pending Review** (Gallery, filter `status = "Pending Review"`, thumbnail = `thumbnail`)
- **Calendar** (Calendar, date = `scheduled_at`)
- **Published** (Grid, filter `status = "Published"`)

## Step 6: Mobile Interface (Interface Designer)

1. Top bar → **Interfaces** → Add new
2. Layout: **Record review**
3. Source: Videos, filter `status = "Pending Review"`
4. Elements:
   - Video player (URL field: `final_url`)
   - Header text: `title`
   - Badges: `pillar`, `score`
   - Buttons: Approve, Reject, Schedule
5. Publish → save URL, share to mobile (Airtable mobile app sẽ pick up).

## Step 7: Update .env

```
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
```

## Verify

```bash
npm run test:airtable
```

Kết quả mong đợi:
```
✓ [airtable] Base has 4 tables
  - BrandProfile: 14 fields, 1 view
  - Ideas: 12 fields, 2 views
  - Scripts: 13 fields, 2 views
  - Videos: 14 fields, 3 views
✓ [airtable] Test record deleted ✓ — read/write works
```
