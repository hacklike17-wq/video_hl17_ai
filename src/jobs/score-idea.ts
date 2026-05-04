import { db } from "@/db";
import { brandProfile, ideas, jobsLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scoreIdea } from "@/services/anthropic";

export async function runScoreIdea(ideaId: string) {
  const started = Date.now();
  const log = db
    .insert(jobsLog)
    .values({
      jobType: "score-idea",
      status: "running",
      refTable: "ideas",
      refId: ideaId,
    })
    .returning()
    .get();

  try {
    const idea = db.select().from(ideas).where(eq(ideas.id, ideaId)).get();
    if (!idea) throw new Error(`Idea không tồn tại: ${ideaId}`);

    const brand = idea.brandId
      ? db.select().from(brandProfile).where(eq(brandProfile.id, idea.brandId)).get()
      : db.select().from(brandProfile).limit(1).get();

    const result = await scoreIdea(
      {
        title: idea.title,
        hookText: idea.hookText,
        sourceUrl: idea.sourceUrl,
        sourcePlatform: idea.sourcePlatform,
        viewCount: idea.viewCount,
        rawData: idea.rawData,
      },
      {
        contentPillars: brand?.contentPillars ?? null,
        bannedTopics: brand?.bannedTopics ?? null,
        voiceStyle: brand?.voiceStyle ?? null,
      },
    );

    db.update(ideas)
      .set({
        score: result.score,
        pillar: result.pillar,
        angle: result.angle,
        status: result.rejected ? "rejected" : "idea",
      })
      .where(eq(ideas.id, ideaId))
      .run();

    db.update(jobsLog)
      .set({
        status: "success",
        durationMs: Date.now() - started,
        payload: result,
      })
      .where(eq(jobsLog.id, log.id))
      .run();

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.update(jobsLog)
      .set({ status: "failed", error: msg, durationMs: Date.now() - started })
      .where(eq(jobsLog.id, log.id))
      .run();
    throw err;
  }
}
