import { eq } from "drizzle-orm";
import { db } from "../db";
import { jobsLog, scripts, videos } from "../db/schema";
import { pickBestPortraitFile, searchPortraitVideos } from "../services/pexels";
import { ensureVideoForScript, tryMarkAssetsReady } from "./_video-helpers";

export async function runFetchBroll(opts: { scriptId: string }) {
  const started = Date.now();
  const log = db
    .insert(jobsLog)
    .values({
      jobType: "fetch-broll",
      status: "running",
      refTable: "scripts",
      refId: opts.scriptId,
    })
    .returning()
    .get();

  try {
    const script = db.select().from(scripts).where(eq(scripts.id, opts.scriptId)).get();
    if (!script) throw new Error(`Kịch bản không tồn tại: ${opts.scriptId}`);

    const prompts = (script.brollPrompts ?? []).filter(Boolean);
    if (prompts.length === 0) {
      throw new Error("Kịch bản không có b-roll prompts.");
    }

    const videoId = ensureVideoForScript(script.id);

    const urls: string[] = [];
    const failed: string[] = [];
    for (const prompt of prompts) {
      try {
        const vids = await searchPortraitVideos({
          query: prompt,
          perPage: 5,
          minDuration: 4,
          maxDuration: 30,
        });
        if (vids.length === 0) {
          // fallback: thử search lại không filter duration
          const fallback = await searchPortraitVideos({ query: prompt, perPage: 5 });
          const f = fallback[0];
          const url = f ? pickBestPortraitFile(f) : null;
          if (url) urls.push(url);
          else failed.push(prompt);
          continue;
        }
        const url = pickBestPortraitFile(vids[0]);
        if (url) urls.push(url);
        else failed.push(prompt);
      } catch (e) {
        failed.push(prompt);
      }
    }

    if (urls.length === 0) {
      throw new Error(`Pexels không trả về video nào cho ${prompts.length} prompts.`);
    }

    db.update(videos).set({ brollUrls: urls }).where(eq(videos.id, videoId)).run();
    await tryMarkAssetsReady(videoId);

    db.update(jobsLog)
      .set({
        status: "success",
        durationMs: Date.now() - started,
        payload: { videoId, found: urls.length, requested: prompts.length, failed },
      })
      .where(eq(jobsLog.id, log.id))
      .run();

    return { videoId, urls, failed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.update(jobsLog)
      .set({ status: "failed", error: msg, durationMs: Date.now() - started })
      .where(eq(jobsLog.id, log.id))
      .run();
    throw err;
  }
}
