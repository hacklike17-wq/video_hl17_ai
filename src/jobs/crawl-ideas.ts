import { db } from "@/db";
import { brandProfile, ideas, jobsLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runTikTokScraper, tiktokItemToIdea } from "@/services/apify";
import { ideasQueue } from "./queue";

export async function runCrawlIdeas(opts: { brandId?: string; limit?: number }) {
  const started = Date.now();
  const log = db
    .insert(jobsLog)
    .values({ jobType: "crawl-ideas", status: "running", payload: opts })
    .returning()
    .get();

  try {
    // Resolve brand to derive search hashtags from contentPillars.
    let brand = opts.brandId
      ? db.select().from(brandProfile).where(eq(brandProfile.id, opts.brandId)).get()
      : db.select().from(brandProfile).limit(1).get();

    if (!brand) {
      throw new Error("Chưa có BrandProfile. Vào /brand tạo trước khi crawl.");
    }

    const pillars = (brand.contentPillars ?? "")
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const hashtags = pillars.length ? pillars : ["ai", "tech"];
    const items = await runTikTokScraper({
      hashtags: hashtags.slice(0, 3),
      maxItems: opts.limit ?? 20,
    });

    let inserted = 0;
    for (const item of items) {
      const ideaData = tiktokItemToIdea(item);
      // Skip if we already have this URL
      if (ideaData.sourceUrl) {
        const existing = db
          .select({ id: ideas.id })
          .from(ideas)
          .where(eq(ideas.sourceUrl, ideaData.sourceUrl))
          .get();
        if (existing) continue;
      }
      const inserted_idea = db
        .insert(ideas)
        .values({ ...ideaData, brandId: brand.id })
        .returning({ id: ideas.id })
        .get();
      inserted++;
      // Queue scoring job
      await ideasQueue.add(
        "score-idea",
        { type: "score-idea", data: { ideaId: inserted_idea.id } },
        { jobId: `score:${inserted_idea.id}` },
      );
    }

    db.update(jobsLog)
      .set({
        status: "success",
        durationMs: Date.now() - started,
        payload: { ...opts, fetched: items.length, inserted },
      })
      .where(eq(jobsLog.id, log.id))
      .run();

    return { fetched: items.length, inserted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.update(jobsLog)
      .set({ status: "failed", error: msg, durationMs: Date.now() - started })
      .where(eq(jobsLog.id, log.id))
      .run();
    throw err;
  }
}
