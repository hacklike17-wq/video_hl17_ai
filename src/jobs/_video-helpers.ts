import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { videos } from "../db/schema";
import { ideasQueue } from "./queue";

/**
 * Đảm bảo có 1 record video cho script. KHÔNG reset bất kỳ field nào nếu đã tồn tại
 * — để các job song song (voice + broll) không ghi đè kết quả của nhau.
 *
 * Chỉ caller duyệt kịch bản (approveScriptAction) hoặc người dùng "Tạo lại"
 * mới nên gọi resetVideoAssets() để xoá field cũ.
 */
export function ensureVideoForScript(scriptId: string) {
  const existing = db.select().from(videos).where(eq(videos.scriptId, scriptId)).get();
  if (existing) return existing.id;
  const inserted = db
    .insert(videos)
    .values({ scriptId, status: "generating_assets" })
    .returning({ id: videos.id })
    .get();
  return inserted.id;
}

/**
 * Reset toàn bộ asset của video về trạng thái generating_assets.
 * Dùng khi user duyệt kịch bản hoặc bấm "Tạo lại tài nguyên".
 */
export function resetVideoAssets(scriptId: string) {
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
 * Race-safe: dùng RETURNING để đảm bảo chỉ enqueue assemble đúng 1 lần (job nào
 * thắng update transition thì job đó queue tiếp).
 *
 * Phase 5: voice + broll đủ → status='assembling' + queue assemble-video job.
 */
export async function tryMarkAssetsReady(videoId: string): Promise<void> {
  const updated = db
    .update(videos)
    .set({ status: "assembling" })
    .where(
      and(
        eq(videos.id, videoId),
        eq(videos.status, "generating_assets"),
        isNotNull(videos.voiceUrl),
        isNotNull(videos.brollUrls),
      ),
    )
    .returning({ id: videos.id })
    .all();

  if (updated.length === 0) return;

  await ideasQueue.add(
    "assemble-video",
    { type: "assemble-video", data: { videoId } },
    { jobId: `assemble_${videoId}_${Date.now()}` },
  );
}

export function getVideoByScriptId(scriptId: string) {
  return db.select().from(videos).where(eq(videos.scriptId, scriptId)).get();
}
