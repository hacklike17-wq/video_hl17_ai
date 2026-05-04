import "server-only";
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
