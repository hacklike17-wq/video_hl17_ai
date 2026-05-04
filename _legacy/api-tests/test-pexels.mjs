// Test Pexels: search videos for b-roll prompts
import { log, ok, fail, require_env, fetchJSON, saveOutput } from "./_lib.mjs";

const LABEL = "pexels";

async function main() {
  require_env("PEXELS_API_KEY");

  const queries = [
    "developer typing on laptop",
    "ai neural network animation",
    "code editor screen",
  ];

  log(LABEL, `Searching ${queries.length} queries...`);
  const t0 = Date.now();

  const results = await Promise.all(
    queries.map(async (q) => {
      const data = await fetchJSON(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=3&orientation=portrait`,
        { headers: { Authorization: process.env.PEXELS_API_KEY } }
      );
      return { query: q, count: data.videos?.length || 0, videos: data.videos };
    })
  );

  const elapsed = Date.now() - t0;
  const total = results.reduce((s, r) => s + r.count, 0);

  ok(LABEL, `Found ${total} videos across ${queries.length} queries in ${elapsed}ms`);
  results.forEach((r) => {
    console.log(`  "${r.query}": ${r.count} clips`);
    r.videos?.slice(0, 1).forEach((v) => {
      const sd = v.video_files?.find((f) => f.quality === "sd");
      console.log(`    e.g. ${v.duration}s by ${v.user?.name}, ${sd?.width}x${sd?.height}`);
    });
  });

  saveOutput("pexels-results.json", results);
  console.log(`  Saved: api-tests/output/pexels-results.json`);
}

main().catch((e) => {
  fail(LABEL, e);
  process.exit(1);
});
