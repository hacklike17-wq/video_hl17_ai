import { eq } from "drizzle-orm";
import { join } from "node:path";
import { db } from "../db";
import { ideas, jobsLog, scripts, videos } from "../db/schema";
import {
  assembleVideo,
  cleanupDir,
  downloadTo,
  makeWorkDir,
  probeDurationSec,
} from "../services/ffmpeg";
import { uploadVideoFile } from "../services/cloudinary";
import { createSubmagicProject } from "../services/submagic";
import { pickBestPortraitFile, searchPortraitVideos } from "../services/pexels";
import { env } from "../lib/env";

/** Lượng đệm thêm (giây) — đảm bảo tổng b-roll >= audio + buffer. */
const BUFFER_SEC = 2;

/** Số b-roll tối thiểu để đảm bảo có chuyển cảnh. */
const MIN_BROLLS = 3;

export async function runAssembleVideo(opts: { videoId: string }) {
  const started = Date.now();
  const log = db
    .insert(jobsLog)
    .values({
      jobType: "assemble-video",
      status: "running",
      refTable: "videos",
      refId: opts.videoId,
    })
    .returning()
    .get();

  let workDir: string | null = null;

  try {
    const video = db.select().from(videos).where(eq(videos.id, opts.videoId)).get();
    if (!video) throw new Error(`Video không tồn tại: ${opts.videoId}`);
    if (!video.voiceUrl) throw new Error("Video chưa có voiceUrl");
    if (!video.brollUrls || video.brollUrls.length === 0)
      throw new Error("Video chưa có brollUrls");

    const script = db.select().from(scripts).where(eq(scripts.id, video.scriptId)).get();
    const idea = script ? db.select().from(ideas).where(eq(ideas.id, script.ideaId)).get() : null;

    db.update(videos).set({ status: "assembling" }).where(eq(videos.id, video.id)).run();

    workDir = await makeWorkDir("assemble");

    // Download voice
    const voicePath = join(workDir, "voice.mp3");
    await downloadTo(video.voiceUrl, voicePath);
    const audioDur = await probeDurationSec(voicePath);

    // Download initial b-rolls
    let brollUrls = [...video.brollUrls];
    const brollPaths: string[] = [];
    let totalBrollDur = 0;
    for (let i = 0; i < brollUrls.length; i++) {
      const p = join(workDir, `broll_${i}.mp4`);
      try {
        await downloadTo(brollUrls[i], p);
        const d = await probeDurationSec(p);
        brollPaths.push(p);
        totalBrollDur += d;
      } catch (err) {
        console.warn(`Bỏ qua b-roll ${i} không tải được: ${(err as Error).message}`);
      }
    }

    // Nếu thiếu thời lượng → fetch thêm Pexels (dùng pillar + title)
    if (totalBrollDur < audioDur + BUFFER_SEC || brollPaths.length < MIN_BROLLS) {
      const fallbackQuery =
        idea?.pillar ?? script?.brollPrompts?.[0] ?? idea?.title ?? "abstract motion";
      const more = await searchPortraitVideos({
        query: fallbackQuery.slice(0, 50),
        perPage: 8,
        minDuration: 4,
      });
      const usedUrls = new Set(brollUrls);
      for (const v of more) {
        if (totalBrollDur >= audioDur + BUFFER_SEC && brollPaths.length >= MIN_BROLLS) break;
        const url = pickBestPortraitFile(v);
        if (!url || usedUrls.has(url)) continue;
        const p = join(workDir, `broll_extra_${brollPaths.length}.mp4`);
        try {
          await downloadTo(url, p);
          const d = await probeDurationSec(p);
          brollPaths.push(p);
          brollUrls.push(url);
          usedUrls.add(url);
          totalBrollDur += d;
        } catch {
          // skip silently
        }
      }
    }

    if (brollPaths.length === 0) {
      throw new Error("Không tải được b-roll nào — không thể ghép video.");
    }

    // FFmpeg merge
    const mergedPath = join(workDir, "merged.mp4");
    await assembleVideo({
      voicePath,
      brollPaths,
      outputPath: mergedPath,
    });

    // Upload merged.mp4 to Cloudinary
    const filename = `${(idea?.title ?? "video").slice(0, 40).replace(/[^\w]+/g, "_")}_v${
      script?.version ?? 1
    }.mp4`;
    const upload = await uploadVideoFile({ filePath: mergedPath, filename });

    // Save brollUrls (có thể đã thêm fallback) + status assembling
    db.update(videos)
      .set({
        brollUrls,
        status: "rendering",
      })
      .where(eq(videos.id, video.id))
      .run();

    // Submit to Submagic
    const webhookUrl = `${env.APP_URL}/api/webhooks/submagic${
      env.SUBMAGIC_WEBHOOK_SECRET ? `?secret=${env.SUBMAGIC_WEBHOOK_SECRET}` : ""
    }`;
    const project = await createSubmagicProject({
      title: idea?.title?.slice(0, 80) ?? "video",
      videoUrl: upload.url,
      language: "vi",
      templateName: env.SUBMAGIC_TEMPLATE_NAME,
      webhookUrl,
    });

    db.update(videos)
      .set({ submagicProjectId: project.id })
      .where(eq(videos.id, video.id))
      .run();

    db.update(jobsLog)
      .set({
        status: "success",
        durationMs: Date.now() - started,
        payload: {
          mergedUrl: upload.url,
          submagicProjectId: project.id,
          brollCount: brollPaths.length,
          audioDurationSec: audioDur,
        },
      })
      .where(eq(jobsLog.id, log.id))
      .run();

    return { mergedUrl: upload.url, submagicProjectId: project.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.update(videos)
      .set({ status: "submagic_failed", rejectReason: msg })
      .where(eq(videos.id, opts.videoId))
      .run();
    db.update(jobsLog)
      .set({ status: "failed", error: msg, durationMs: Date.now() - started })
      .where(eq(jobsLog.id, log.id))
      .run();
    throw err;
  } finally {
    if (workDir) {
      try {
        await cleanupDir(workDir);
      } catch {
        /* ignore */
      }
    }
  }
}
