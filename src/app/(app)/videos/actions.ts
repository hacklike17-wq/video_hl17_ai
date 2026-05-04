"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ideas, scripts, videos } from "@/db/schema";
import { ideasQueue } from "@/jobs/queue";

export type ActionResult = { ok: boolean; error?: string; message?: string };

export async function rejectVideoAction(id: string, reason?: string): Promise<ActionResult> {
  db.update(videos)
    .set({ status: "rejected", rejectReason: reason ?? null })
    .where(eq(videos.id, id))
    .run();
  revalidatePath("/videos");
  revalidatePath(`/videos/${id}`);
  return { ok: true };
}

export async function regenerateAssetsAction(id: string): Promise<ActionResult> {
  const v = db.select().from(videos).where(eq(videos.id, id)).get();
  if (!v) return { ok: false, error: "Không tìm thấy video" };

  db.update(videos)
    .set({
      status: "generating_assets",
      voiceUrl: null,
      brollUrls: null,
      rejectReason: null,
    })
    .where(eq(videos.id, id))
    .run();

  try {
    await Promise.all([
      ideasQueue.add(
        "generate-voice",
        { type: "generate-voice", data: { scriptId: v.scriptId } },
        { jobId: `voice_${v.scriptId}_${Date.now()}` },
      ),
      ideasQueue.add(
        "fetch-broll",
        { type: "fetch-broll", data: { scriptId: v.scriptId } },
        { jobId: `broll_${v.scriptId}_${Date.now()}` },
      ),
    ]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  revalidatePath("/videos");
  revalidatePath(`/videos/${id}`);
  return { ok: true, message: "Đã tạo lại giọng đọc + b-roll" };
}

export async function deleteVideoAction(id: string): Promise<ActionResult> {
  const v = db.select().from(videos).where(eq(videos.id, id)).get();
  if (v?.scriptId) {
    db.update(scripts).set({ status: "pending_review" }).where(eq(scripts.id, v.scriptId)).run();
    const sc = db.select().from(scripts).where(eq(scripts.id, v.scriptId)).get();
    if (sc?.ideaId) {
      db.update(ideas).set({ status: "script_gen" }).where(eq(ideas.id, sc.ideaId)).run();
    }
  }
  db.delete(videos).where(eq(videos.id, id)).run();
  revalidatePath("/videos");
  revalidatePath("/scripts");
  revalidatePath("/ideas");
  return { ok: true };
}
