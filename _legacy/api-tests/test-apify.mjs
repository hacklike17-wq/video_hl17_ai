// Test Apify: run TikTok scraper for a small batch (5 videos) by hashtag
import { log, ok, fail, require_env, fetchJSON, saveOutput } from "./_lib.mjs";

const LABEL = "apify";

async function main() {
  require_env("APIFY_TOKEN");
  const actor = (process.env.APIFY_TIKTOK_ACTOR || "clockworks/tiktok-scraper").replace("/", "~");

  log(LABEL, `Running ${actor} (5 results, hashtag #ai)...`);
  const t0 = Date.now();

  const runRes = await fetchJSON(
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hashtags: ["ai"],
        resultsPerPage: 5,
        shouldDownloadCovers: false,
        shouldDownloadVideos: false,
        shouldDownloadAvatars: false,
      }),
    }
  );

  const elapsed = Date.now() - t0;

  if (!Array.isArray(runRes) || !runRes.length) {
    throw new Error(`No results returned. Got: ${JSON.stringify(runRes).slice(0, 200)}`);
  }

  ok(LABEL, `Scraped ${runRes.length} items in ${(elapsed / 1000).toFixed(1)}s`);
  runRes.slice(0, 3).forEach((item, i) => {
    const text = (item.text || "").slice(0, 80);
    const views = item.playCount || item.diggCount || "?";
    console.log(`  ${i + 1}. ${text}... (${views} views)`);
  });

  saveOutput("apify-tiktok.json", runRes);

  // Check usage
  const userRes = await fetchJSON(`https://api.apify.com/v2/users/me?token=${process.env.APIFY_TOKEN}`);
  console.log(`  Account: ${userRes.data?.username} | Plan: ${userRes.data?.plan?.id || "free"}`);
  console.log(`  Saved: api-tests/output/apify-tiktok.json`);
}

main().catch((e) => {
  fail(LABEL, e);
  process.exit(1);
});
