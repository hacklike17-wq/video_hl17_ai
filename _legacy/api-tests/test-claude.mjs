// Test Claude API: generate a sample script for a given idea
import Anthropic from "@anthropic-ai/sdk";
import { log, ok, fail, require_env, saveOutput } from "./_lib.mjs";

const LABEL = "claude";

async function main() {
  require_env("ANTHROPIC_API_KEY");
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  log(LABEL, `Calling ${model}...`);
  const t0 = Date.now();

  const idea = {
    title: "5 AI tools làm việc thay tôi 8h/ngày",
    pillar: "Productivity",
    angle: "Approach từ góc devs, stack: Claude Code, Cursor, n8n, Linear, Granola",
  };

  const brand = {
    name: "Henry",
    voice_style: "casual, energetic, Vietnamese with occasional English tech terms",
    signature_phrases: ["Thật ra thì...", "Nói thẳng nha", "Cái này nhiều người không biết"],
    pillars: ["Tech", "AI", "Productivity"],
  };

  const systemPrompt = `Bạn là content writer cho ${brand.name}, chuyên viết script video TikTok/Reels < 60s tiếng Việt.

Tone: ${brand.voice_style}
Signature phrases (dùng tự nhiên 1-2 lần): ${brand.signature_phrases.join(", ")}
Content pillars: ${brand.pillars.join(", ")}

Cấu trúc video 50s gồm 5 phần:
- HOOK (0-3s, avatar talking-head): câu mở mạnh, gây tò mò
- SETUP (3-8s, b-roll voiceover): nêu vấn đề/context
- BODY (8-35s, b-roll voiceover): nội dung chính
- PAYOFF (35-50s, avatar talking-head): insight, cảm xúc
- CTA (50-55s, avatar): call to action ngắn

Trả về JSON với format chính xác:
{
  "hook": "...",
  "setup": "...",
  "body": "...",
  "payoff": "...",
  "cta": "...",
  "broll_prompts": ["english search query 1", "english search query 2", ...]
}

broll_prompts: 8-10 query tiếng Anh để search trên Pexels/Storyblocks.`;

  const userPrompt = `Idea:
- Title: ${idea.title}
- Pillar: ${idea.pillar}
- Angle: ${idea.angle}

Viết script. CHỈ trả về JSON, không markdown.`;

  const resp = await client.messages.create({
    model,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const elapsed = Date.now() - t0;
  const text = resp.content[0].text;

  let parsed;
  try {
    // Strip markdown if present
    const clean = text.replace(/^```json\s*/, "").replace(/```\s*$/, "");
    parsed = JSON.parse(clean);
  } catch (e) {
    throw new Error(`Failed to parse JSON. Raw: ${text.slice(0, 300)}`);
  }

  // Validate structure
  const required = ["hook", "setup", "body", "payoff", "cta", "broll_prompts"];
  const missing = required.filter((k) => !parsed[k]);
  if (missing.length) throw new Error(`Missing fields: ${missing.join(", ")}`);

  saveOutput("claude-script.json", parsed);
  ok(LABEL, `Script generated in ${elapsed}ms (${resp.usage.input_tokens} in / ${resp.usage.output_tokens} out tokens)`);
  console.log(`  Hook: "${parsed.hook}"`);
  console.log(`  B-roll prompts: ${parsed.broll_prompts.length}`);
  console.log(`  Saved: api-tests/output/claude-script.json`);
}

main().catch((e) => {
  fail(LABEL, e);
  process.exit(1);
});
