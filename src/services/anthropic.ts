import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY chưa được cấu hình. Thêm vào .env và restart.");
  }
  _client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export type IdeaScoringInput = {
  title: string;
  hookText?: string | null;
  sourceUrl?: string | null;
  sourcePlatform?: string | null;
  viewCount?: number | null;
  rawData?: Record<string, unknown> | null;
};

export type IdeaScoringBrandContext = {
  contentPillars?: string | null;
  bannedTopics?: string | null;
  voiceStyle?: string | null;
};

export type IdeaScoringResult = {
  score: number; // 0..10
  pillar: string | null;
  angle: string;
  rejected: boolean;
  reason?: string;
};

const SCORING_SYSTEM = `Bạn là content strategist cho kênh short-form video. Nhiệm vụ:
1. Đánh giá idea từ TikTok/social trên thang 0–10 dựa trên tiềm năng viral + phù hợp với brand.
2. Gán pillar phù hợp từ danh sách pillars của brand (hoặc null nếu không hợp).
3. Đề xuất "angle" — cách brand mình kể lại idea này theo voice của mình (1-2 câu).
4. Đánh dấu rejected=true nếu idea trùng với banned topics.

Trả về JSON chính xác theo schema, không thêm markdown wrapper, không thêm comment.`;

export async function scoreIdea(
  idea: IdeaScoringInput,
  brand: IdeaScoringBrandContext,
): Promise<IdeaScoringResult> {
  const client = getClient();

  const userPrompt = JSON.stringify(
    {
      brand: {
        content_pillars: brand.contentPillars ?? "(chưa cấu hình)",
        banned_topics: brand.bannedTopics ?? "(không có)",
        voice_style: brand.voiceStyle ?? "(chưa cấu hình)",
      },
      idea: {
        title: idea.title,
        hook: idea.hookText ?? null,
        source_url: idea.sourceUrl ?? null,
        platform: idea.sourcePlatform ?? null,
        view_count: idea.viewCount ?? null,
        raw: idea.rawData ?? null,
      },
      output_schema: {
        score: "number 0-10 (1 decimal)",
        pillar: "string from brand pillars OR null",
        angle: "1-2 câu mô tả góc kể của brand",
        rejected: "boolean",
        reason: "string (chỉ điền nếu rejected=true)",
      },
    },
    null,
    2,
  );

  const resp = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 512,
    system: SCORING_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = resp.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Strip markdown code fences if Claude wraps the JSON
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  let parsed: IdeaScoringResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Claude trả về JSON không hợp lệ: ${cleaned.slice(0, 200)}`);
  }

  return {
    score: Number(parsed.score) || 0,
    pillar: parsed.pillar ?? null,
    angle: parsed.angle ?? "",
    rejected: !!parsed.rejected,
    reason: parsed.reason,
  };
}

// ============================================================
// Script generation
// ============================================================

export type ScriptIdeaInput = {
  title: string;
  hookText?: string | null;
  angle?: string | null;
  pillar?: string | null;
  sourceUrl?: string | null;
};

export type ScriptBrandInput = {
  name?: string | null;
  voiceStyle?: string | null;
  signaturePhrases?: string | null;
  contentPillars?: string | null;
  bannedTopics?: string | null;
  hookExamples?: string | null;
  scriptExamples?: string | null;
  defaultCta?: string | null;
};

export type GeneratedScript = {
  hook: string;
  setup: string;
  body: string;
  payoff: string;
  cta: string;
  brollPrompts: string[];
};

const SCRIPT_SYSTEM = `Bạn là copywriter Vietnamese cho video ngắn (TikTok / Reels / Shorts, 45-60 giây).
Sinh kịch bản theo cấu trúc 5 phần + b-roll prompts. Yêu cầu:

1. HOOK (3-5s): câu mở đầu cực ngắn, gây tò mò hoặc shock. KHÔNG mô tả nội dung sẽ kể, mà tạo lý do để xem tiếp.
2. SETUP (5-10s): thiết lập bối cảnh, nêu vấn đề/câu hỏi.
3. BODY (20-30s): nội dung chính. Có thể có 2-3 mini-beats. Cụ thể, dẫn chứng, ví dụ.
4. PAYOFF (5-10s): kết luận, twist, hoặc insight đáng nhớ.
5. CTA (3-5s): kêu gọi hành động ngắn (follow, comment, share).

B-ROLL PROMPTS (3-5 prompts): mỗi prompt mô tả 1 cảnh quay phụ để Pexels search được.
   - Tiếng Anh, ngắn, cụ thể, dễ tìm video stock.
   - Ví dụ: "developer typing code at night", "lo-fi office desk with laptop", "ai robot illustration motion graphic".

Yêu cầu giọng văn:
- Theo voice_style và signature_phrases của brand.
- Tránh từ chuyên ngành rườm rà, viết như nói chuyện.
- Câu ngắn, dễ đọc thành lời.
- Không đặt dấu xuống dòng giữa câu.
- Tổng độ dài kịch bản ~120-180 từ tiếng Việt.

Trả về JSON đúng schema, KHÔNG markdown wrapper, KHÔNG comment.`;

export async function generateScript(opts: {
  idea: ScriptIdeaInput;
  brand: ScriptBrandInput;
}): Promise<GeneratedScript> {
  const client = getClient();

  const userPrompt = JSON.stringify(
    {
      brand: {
        name: opts.brand.name ?? null,
        voice_style: opts.brand.voiceStyle ?? null,
        signature_phrases: opts.brand.signaturePhrases ?? null,
        content_pillars: opts.brand.contentPillars ?? null,
        banned_topics: opts.brand.bannedTopics ?? null,
        hook_examples: opts.brand.hookExamples ?? null,
        script_examples: opts.brand.scriptExamples ?? null,
        default_cta: opts.brand.defaultCta ?? null,
      },
      idea: {
        title: opts.idea.title,
        hook_source: opts.idea.hookText ?? null,
        suggested_angle: opts.idea.angle ?? null,
        pillar: opts.idea.pillar ?? null,
        source_url: opts.idea.sourceUrl ?? null,
      },
      output_schema: {
        hook: "string (1 câu, 5-12 từ)",
        setup: "string (1-2 câu, 5-10s khi đọc to)",
        body: "string (3-6 câu, 20-30s khi đọc to)",
        payoff: "string (1-2 câu, 5-10s)",
        cta: "string (1 câu)",
        broll_prompts: "string[] (3-5 prompts ngắn tiếng Anh)",
      },
    },
    null,
    2,
  );

  const resp = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 1500,
    system: SCRIPT_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = resp.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  let parsed: {
    hook?: string;
    setup?: string;
    body?: string;
    payoff?: string;
    cta?: string;
    broll_prompts?: string[];
  };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude trả về JSON không hợp lệ cho script: ${cleaned.slice(0, 300)}`);
  }

  return {
    hook: parsed.hook ?? "",
    setup: parsed.setup ?? "",
    body: parsed.body ?? "",
    payoff: parsed.payoff ?? "",
    cta: parsed.cta ?? opts.brand.defaultCta ?? "",
    brollPrompts: Array.isArray(parsed.broll_prompts) ? parsed.broll_prompts : [],
  };
}
