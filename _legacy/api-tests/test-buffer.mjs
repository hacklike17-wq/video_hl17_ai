// Test Buffer: list connected channels (verify token + channel list)
import { log, ok, fail, require_env, fetchJSON } from "./_lib.mjs";

const LABEL = "buffer";

async function main() {
  require_env("BUFFER_ACCESS_TOKEN");

  log(LABEL, "Fetching connected channels...");
  // Buffer Publish API (v2)
  const channels = await fetchJSON(
    `https://api.bufferapp.com/2/profiles.json?access_token=${process.env.BUFFER_ACCESS_TOKEN}`
  );

  ok(LABEL, `Found ${channels.length} connected channels`);
  channels.forEach((c) => {
    console.log(`  - ${c.service}: ${c.formatted_username || c.service_username} (${c.timezone})`);
  });

  const wanted = ["tiktok", "instagram", "youtube"];
  const have = channels.map((c) => c.service);
  const missing = wanted.filter((w) => !have.some((h) => h.includes(w)));
  if (missing.length) {
    console.log(`\n  Missing platforms: ${missing.join(", ")} — connect them in Buffer dashboard`);
  }
}

main().catch((e) => {
  fail(LABEL, e);
  process.exit(1);
});
