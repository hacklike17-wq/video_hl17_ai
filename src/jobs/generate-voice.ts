import { eq } from "drizzle-orm";
import { db } from "../db";
import { brandProfile, ideas, jobsLog, scripts, videos } from "../db/schema";
import { generateVoiceMp3, joinScriptForTTS } from "../services/elevenlabs";
import { uploadAudio } from "../services/cloudinary";
import { getOrCreateVideoForScript, tryMarkAssetsReady } from "./_video-helpers";

export async function runGenerateVoice(opts: { scriptId: string }) {
  const started = Date.now();
  const log = db
    .insert(jobsLog)
    .values({
      jobType: "generate-voice",
      status: "running",
      refTable: "scripts",
      refId: opts.scriptId,
    })
    .returning()
    .get();

  try {
    const script = db.select().from(scripts).where(eq(scripts.id, opts.scriptId)).get();
    if (!script) throw new Error(`Kịch bản không tồn tại: ${opts.scriptId}`);

    const idea = db.select().from(ideas).where(eq(ideas.id, script.ideaId)).get();
    const brand = script.brandId
      ? db.select().from(brandProfile).where(eq(brandProfile.id, script.brandId)).get()
      : db.select().from(brandProfile).limit(1).get();

    const voiceId = brand?.voiceIdElevenLabs;
    if (!voiceId) {
      throw new Error("Hồ sơ thương hiệu chưa có ElevenLabs Voice ID. Vào /brand cấu hình.");
    }

    const text = joinScriptForTTS({
      hook: script.hook,
      setup: script.setup,
      body: script.body,
      payoff: script.payoff,
      cta: script.cta,
    });

    const videoId = getOrCreateVideoForScript(script.id);

    const mp3 = await generateVoiceMp3({ text, voiceId });
    const filename = `${(idea?.title ?? "voice").slice(0, 40).replace(/[^\w]+/g, "_")}_v${script.version}.mp3`;
    const upload = await uploadAudio({ buffer: mp3, filename });

    db.update(videos).set({ voiceUrl: upload.url }).where(eq(videos.id, videoId)).run();
    tryMarkAssetsReady(videoId);

    db.update(jobsLog)
      .set({
        status: "success",
        durationMs: Date.now() - started,
        payload: { videoId, voiceUrl: upload.url, bytes: upload.bytes, chars: text.length },
      })
      .where(eq(jobsLog.id, log.id))
      .run();

    return { videoId, voiceUrl: upload.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Nếu video đã tồn tại, mark voice failed
    const video = db.select().from(videos).where(eq(videos.scriptId, opts.scriptId)).get();
    if (video) {
      db.update(videos).set({ status: "argil_failed", rejectReason: msg }).where(eq(videos.id, video.id)).run();
    }
    db.update(jobsLog)
      .set({ status: "failed", error: msg, durationMs: Date.now() - started })
      .where(eq(jobsLog.id, log.id))
      .run();
    throw err;
  }
}
