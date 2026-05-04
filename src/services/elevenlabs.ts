import { env } from "../lib/env";

/**
 * Gọi ElevenLabs Text-to-Speech, trả về Buffer MP3.
 * Dùng model multilingual_v2 mặc định (đọc tiếng Việt được).
 */
export async function generateVoiceMp3(opts: {
  text: string;
  voiceId: string;
  modelId?: string;
}): Promise<Buffer> {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY chưa được cấu hình.");
  }
  if (!opts.voiceId) {
    throw new Error("Thiếu ElevenLabs Voice ID — cấu hình trong /brand.");
  }
  if (!opts.text.trim()) {
    throw new Error("Text rỗng — không thể tạo voice.");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${opts.voiceId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: opts.text,
      model_id: opts.modelId ?? env.ELEVENLABS_MODEL,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs trả lỗi ${res.status}: ${body.slice(0, 300)}`);
  }

  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/** Ghép 5 phần kịch bản thành 1 đoạn text, có dấu chấm câu để TTS biết ngắt. */
export function joinScriptForTTS(parts: {
  hook?: string | null;
  setup?: string | null;
  body?: string | null;
  payoff?: string | null;
  cta?: string | null;
}): string {
  return [parts.hook, parts.setup, parts.body, parts.payoff, parts.cta]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .map((p) => (/[.!?…]$/.test(p) ? p : p + "."))
    .join(" ");
}
