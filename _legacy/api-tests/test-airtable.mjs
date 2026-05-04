// Test Airtable: list base tables, insert+delete a test record in Ideas
import { log, ok, fail, warn, require_env, fetchJSON } from "./_lib.mjs";

const LABEL = "airtable";

async function main() {
  require_env("AIRTABLE_API_KEY", "AIRTABLE_BASE_ID");

  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableIdeas = process.env.AIRTABLE_TABLE_IDEAS || "Ideas";
  const headers = {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };

  log(LABEL, "Fetching base schema...");
  const meta = await fetchJSON(
    `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
    { headers }
  );
  ok(LABEL, `Base has ${meta.tables.length} tables`);
  meta.tables.forEach((t) => {
    console.log(`  - ${t.name}: ${t.fields.length} fields, ${t.views.length} views`);
  });

  // Check required tables exist
  const required = ["Ideas", "Scripts", "Videos", "BrandProfile"];
  const tableNames = meta.tables.map((t) => t.name);
  const missing = required.filter((n) => !tableNames.includes(n));
  if (missing.length) {
    warn(LABEL, `Missing tables: ${missing.join(", ")} — import schema first`);
    return;
  }

  log(LABEL, `Inserting test record into "${tableIdeas}"...`);
  const created = await fetchJSON(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdeas)}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        fields: {
          title: "[TEST] API connectivity check",
          status: "Idea",
        },
      }),
    }
  );
  ok(LABEL, `Created record ${created.id}`);

  log(LABEL, "Deleting test record...");
  await fetchJSON(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdeas)}/${created.id}`,
    { method: "DELETE", headers }
  );
  ok(LABEL, "Test record deleted ✓ — read/write works");
}

main().catch((e) => {
  fail(LABEL, e);
  process.exit(1);
});
