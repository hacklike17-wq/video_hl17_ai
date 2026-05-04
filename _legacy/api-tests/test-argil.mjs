// Test Argil: list avatars + voices to confirm API access
// (Full video generation is async + costly — only verify auth + asset IDs)
import { log, ok, fail, warn, require_env, fetchJSON, saveOutput } from "./_lib.mjs";

const LABEL = "argil";
const BASE = "https://api.argil.ai";

async function main() {
  require_env("ARGIL_API_KEY");

  const headers = {
    "x-api-key": process.env.ARGIL_API_KEY,
    "Content-Type": "application/json",
  };

  log(LABEL, "Fetching avatars...");
  const avatars = await fetchJSON(`${BASE}/avatars`, { headers });
  ok(LABEL, `Found ${avatars.items?.length ?? avatars.length ?? 0} avatars`);

  if (avatars.items?.length) {
    avatars.items.slice(0, 3).forEach((a) => {
      console.log(`  - ${a.id}: ${a.name} (${a.gender || "?"})`);
    });
  }

  log(LABEL, "Fetching voices...");
  const voices = await fetchJSON(`${BASE}/voices`, { headers });
  ok(LABEL, `Found ${voices.items?.length ?? voices.length ?? 0} voices`);

  if (voices.items?.length) {
    voices.items.slice(0, 3).forEach((v) => {
      console.log(`  - ${v.id}: ${v.name}`);
    });
  }

  saveOutput("argil-avatars.json", avatars);
  saveOutput("argil-voices.json", voices);

  // Check if user-defined IDs exist
  if (process.env.ARGIL_AVATAR_ID) {
    const found = (avatars.items || avatars).find((a) => a.id === process.env.ARGIL_AVATAR_ID);
    if (found) ok(LABEL, `Configured avatar "${found.name}" found ✓`);
    else warn(LABEL, `ARGIL_AVATAR_ID=${process.env.ARGIL_AVATAR_ID} NOT in your account`);
  }

  console.log(`  Saved: api-tests/output/argil-avatars.json, argil-voices.json`);
}

main().catch((e) => {
  fail(LABEL, e);
  process.exit(1);
});
