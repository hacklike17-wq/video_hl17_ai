import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { brandProfile, ideas, jobsLog, scripts } from "../db/schema";
import { generateScript } from "../services/anthropic";

export async function runGenerateScript(opts: { ideaId: string }) {
  const started = Date.now();
  const log = db
    .insert(jobsLog)
    .values({
      jobType: "generate-script",
      status: "running",
      refTable: "ideas",
      refId: opts.ideaId,
    })
    .returning()
    .get();

  try {
    const idea = db.select().from(ideas).where(eq(ideas.id, opts.ideaId)).get();
    if (!idea) throw new Error(`Ý tưởng không tồn tại: ${opts.ideaId}`);

    const brand = idea.brandId
      ? db.select().from(brandProfile).where(eq(brandProfile.id, idea.brandId)).get()
      : db.select().from(brandProfile).limit(1).get();
    if (!brand) throw new Error("Chưa có hồ sơ thương hiệu — vào /brand cấu hình trước.");

    const generated = await generateScript({
      idea: {
        title: idea.title,
        hookText: idea.hookText,
        angle: idea.angle,
        pillar: idea.pillar,
        sourceUrl: idea.sourceUrl,
      },
      brand: {
        name: brand.name,
        voiceStyle: brand.voiceStyle,
        signaturePhrases: brand.signaturePhrases,
        contentPillars: brand.contentPillars,
        bannedTopics: brand.bannedTopics,
        hookExamples: brand.hookExamples,
        scriptExamples: brand.scriptExamples,
        defaultCta: brand.defaultCta,
      },
    });

    // Find existing script for this idea (any version)
    const existing = db
      .select()
      .from(scripts)
      .where(eq(scripts.ideaId, idea.id))
      .orderBy(desc(scripts.version))
      .get();

    let scriptId: string;
    const nextVersion = existing ? existing.version + 1 : 1;

    if (existing) {
      // Overwrite existing row, bump version
      db.update(scripts)
        .set({
          version: nextVersion,
          hook: generated.hook,
          setup: generated.setup,
          body: generated.body,
          payoff: generated.payoff,
          cta: generated.cta,
          brollPrompts: generated.brollPrompts,
          status: "pending_review",
          rejectReason: null,
        })
        .where(eq(scripts.id, existing.id))
        .run();
      scriptId = existing.id;
    } else {
      const inserted = db
        .insert(scripts)
        .values({
          ideaId: idea.id,
          brandId: brand.id,
          version: 1,
          hook: generated.hook,
          setup: generated.setup,
          body: generated.body,
          payoff: generated.payoff,
          cta: generated.cta,
          brollPrompts: generated.brollPrompts,
          status: "pending_review",
        })
        .returning({ id: scripts.id })
        .get();
      scriptId = inserted.id;
    }

    db.update(ideas).set({ status: "script_gen" }).where(eq(ideas.id, idea.id)).run();

    db.update(jobsLog)
      .set({
        status: "success",
        durationMs: Date.now() - started,
        payload: { scriptId, version: nextVersion },
      })
      .where(eq(jobsLog.id, log.id))
      .run();

    return { scriptId, version: nextVersion };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.update(jobsLog)
      .set({ status: "failed", error: msg, durationMs: Date.now() - started })
      .where(eq(jobsLog.id, log.id))
      .run();
    throw err;
  }
}
