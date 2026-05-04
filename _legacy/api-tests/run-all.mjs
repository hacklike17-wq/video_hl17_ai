// Run all API tests sequentially, report pass/fail summary
import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const tests = [
  { name: "Claude (script gen)", file: "test-claude.mjs" },
  { name: "ElevenLabs (voice)", file: "test-elevenlabs.mjs" },
  { name: "Argil (avatars)", file: "test-argil.mjs" },
  { name: "Apify (TikTok scrape)", file: "test-apify.mjs" },
  { name: "Pexels (b-roll search)", file: "test-pexels.mjs" },
  { name: "Submagic (auth)", file: "test-submagic.mjs" },
  { name: "Airtable (CRUD)", file: "test-airtable.mjs" },
  { name: "Buffer (channels)", file: "test-buffer.mjs" },
];

function runTest(file) {
  return new Promise((resolve) => {
    const proc = spawn("node", [`${__dirname}/${file}`], {
      stdio: "inherit",
      env: process.env,
    });
    proc.on("exit", (code) => resolve(code === 0));
  });
}

const results = [];
console.log("\n========== API CONNECTIVITY TESTS ==========\n");

for (const t of tests) {
  console.log(`\n--- ${t.name} ---`);
  const passed = await runTest(t.file);
  results.push({ ...t, passed });
}

console.log("\n========== SUMMARY ==========");
results.forEach((r) => {
  const mark = r.passed ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`  ${mark} ${r.name}`);
});

const passCount = results.filter((r) => r.passed).length;
console.log(`\n${passCount}/${results.length} tests passed.`);
process.exit(passCount === results.length ? 0 : 1);
