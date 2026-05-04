import { sql, eq, and, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { videos } from "../db/schema";

/**
 * Tạo (hoặc reset) record video cho 1 script. Status mặc định = generating_assets.
 */
export function getOrCreateVideoForScript(scriptId: string) {
  const existing = db.select().from(videos).where(eq(videos.scriptId, scriptId)).get();
  if (existing) {
    db.update(videos)
      .set({
        status: "generating_assets",
        voiceUrl: null,
        brollUrls: null,
        finalUrl: null,
        argilJobId: null,
        submagicProjectId: null,
        rejectReason: null,
      })
      .where(eq(videos.id, existing.id))
      .run();
    return existing.id;
  }
  const inserted = db
    .insert(videos)
    .values({ scriptId, status: "generating_assets" })
    .returning({ id: videos.id })
    .get();
  return inserted.id;
}

/**
 * Sau khi 1 asset (voice / broll) đã được set xong, kiểm tra xem cả 2 đã đủ chưa.
 * Race-safe: chỉ update status khi vẫn đang ở generating_assets và cả 2 URL có giá trị.
 *
 * Phase 4 (no avatar): chỉ cần voice + broll → set pending_review.
 * Phase 5 sẽ thay bằng "assembling" + queue Submagic job.
 */
export function tryMarkAssetsReady(videoId: string) {
  db.update(videos)
    .set({ status: "pending_review" })
    .where(
      and(
        eq(videos.id, videoId),
        eq(videos.status, "generating_assets"),
        isNotNull(videos.voiceUrl),
        isNotNull(videos.brollUrls),
      ),
    )
    .run();
}

export function getVideoByScriptId(scriptId: string) {
  return db.select().from(videos).where(eq(videos.scriptId, scriptId)).get();
}
