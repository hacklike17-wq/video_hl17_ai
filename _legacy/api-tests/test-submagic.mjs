// Test Submagic: ping API, list templates (do not start a real render — costs money)
import { log, ok, fail, warn, require_env, fetchJSON } from "./_lib.mjs";

const LABEL = "submagic";

async function main() {
  require_env("SUBMAGIC_API_KEY");

  const headers = {
    "x-api-key": process.env.SUBMAGIC_API_KEY,
    "Content-Type": "application/json",
  };

  // Submagic API endpoints (verify with their docs at app.submagic.co/api-docs)
  log(LABEL, "Pinging API...");
  try {
    const me = await fetchJSON("https://api.submagic.co/v1/projects?limit=1", { headers });
    ok(LABEL, `API auth OK — recent projects: ${me.projects?.length ?? 0}`);
    if (me.projects?.length) {
      const p = me.projects[0];
      console.log(`  Latest project: "${p.title || p.id}" (${p.status})`);
    }
  } catch (e) {
    if (e.status === 404) {
      warn(LABEL, "Endpoint /v1/projects 404 — Submagic may have changed API. Check docs.");
    } else {
      throw e;
    }
  }

  // Note: real video generation costs credits and takes minutes
  console.log(`\n  ${"\x1b[33m"}NOTE: skipping actual render to avoid burning credits.${"\x1b[0m"}`);
  console.log(`  Real test: upload a 30s clip, get back captioned video.`);
  console.log(`  Run from n8n workflow once integrated.`);
}

main().catch((e) => {
  fail(LABEL, e);
  process.exit(1);
});
