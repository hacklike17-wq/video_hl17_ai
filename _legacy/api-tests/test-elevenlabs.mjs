// Test ElevenLabs: generate voice from cloned voice ID
import { log, ok, fail, require_env, saveOutput } from "./_lib.mjs";

const LABEL = "elevenlabs";

async function main() {
  require_env("ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID");
  const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

  const text = "Xin chào, đây là test giọng nói cho pipeline video AI. Cái này nhiều người không biết — Claude bốn chấm bảy vừa ra mắt và nó thực sự ấn tượng.";

  log(LABEL, `Generating voice (model: ${model}, ${text.length} chars)...`);
  const t0 = Date.now();

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.4,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 300)}`);
  }

  const audioBuf = Buffer.from(await res.arrayBuffer());
  const elapsed = Date.now() - t0;

  saveOutput("elevenlabs-voice.mp3", audioBuf);

  // Get user info to confirm credits
  const userRes = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
  });
  const sub = userRes.ok ? await userRes.json() : null;

  ok(LABEL, `Audio generated in ${elapsed}ms (${(audioBuf.length / 1024).toFixed(1)} KB)`);
  if (sub) {
    console.log(`  Credits: ${sub.character_count}/${sub.character_limit} chars used`);
    console.log(`  Tier: ${sub.tier}`);
  }
  console.log(`  Saved: api-tests/output/elevenlabs-voice.mp3`);
}

main().catch((e) => {
  fail(LABEL, e);
  process.exit(1);
});
