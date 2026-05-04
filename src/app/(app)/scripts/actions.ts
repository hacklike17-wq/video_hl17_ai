"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { scripts, ideas } from "@/db/schema";
import { ideasQueue } from "@/jobs/queue";

export type ActionResult = { ok: boolean; error?: string; message?: string; data?: unknown };

/**
 * Tạo (hoặc tạo lại) kịch bản cho 1 ý tưởng — đẩy job vào queue.
 * Dùng cho cả "Duyệt & tạo kịch bản" trên ý tưởng và "Tạo lại" trên trang kịch bản.
 */
export async function generateScriptForIdeaAction(ideaId: string): Promise<ActionResult> {
  if (!ideaId) return { ok: false, error: "Thiếu ID ý tưởng" };

  // Đặt status idea = script_gen ngay để UI cập nhật, job sẽ chạy nền
  db.update(ideas).set({ status: "script_gen" }).where(eq(ideas.id, ideaId)).run();

  try {
    const job = await ideasQueue.add(
      "generate-script",
      { type: "generate-script", data: { ideaId } },
      { jobId: `gen_script_${ideaId}_${Date.now()}` },
    );
    revalidatePath("/ideas");
    revalidatePath("/scripts");
    return { ok: true, message: `Đã đưa vào hàng đợi: ${job.id}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const updateSchema = z.object({
  hook: z.string(),
  setup: z.string(),
  body: z.string(),
  payoff: z.string(),
  cta: z.string(),
  brollPrompts: z.string(), // newline-separated khi submit
});

export async function updateScriptAction(id: string, formData: FormData): Promise<ActionResult> {
  const data = Object.fromEntries(formData) as Record<string, string>;
  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const v = parsed.data;
  const broll = v.brollPrompts
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  db.update(scripts)
    .set({
      hook: v.hook,
      setup: v.setup,
      body: v.body,
      payoff: v.payoff,
      cta: v.cta,
      brollPrompts: broll,
    })
    .where(eq(scripts.id, id))
    .run();

  revalidatePath(`/scripts/${id}`);
  revalidatePath("/scripts");
  return { ok: true, message: "Đã lưu" };
}

export async function approveScriptAction(id: string): Promise<ActionResult> {
  // Phase 4 sẽ enqueue voice/avatar/broll jobs ở đây. Hiện chỉ chuyển status.
  db.update(scripts).set({ status: "approved" }).where(eq(scripts.id, id)).run();
  const script = db.select().from(scripts).where(eq(scripts.id, id)).get();
  if (script?.ideaId) {
    db.update(ideas).set({ status: "done" }).where(eq(ideas.id, script.ideaId)).run();
  }
  revalidatePath("/scripts");
  revalidatePath(`/scripts/${id}`);
  revalidatePath("/ideas");
  return {
    ok: true,
    message: "Đã duyệt. Bước tạo video tự động sẽ có ở giai đoạn 4.",
  };
}

export async function rejectScriptAction(id: string, reason?: string): Promise<ActionResult> {
  db.update(scripts)
    .set({ status: "rejected", rejectReason: reason ?? null })
    .where(eq(scripts.id, id))
    .run();
  revalidatePath("/scripts");
  revalidatePath(`/scripts/${id}`);
  return { ok: true };
}

export async function regenerateScriptAction(id: string): Promise<ActionResult> {
  const script = db.select().from(scripts).where(eq(scripts.id, id)).get();
  if (!script) return { ok: false, error: "Không tìm thấy kịch bản" };
  return generateScriptForIdeaAction(script.ideaId);
}

export async function deleteScriptAction(id: string): Promise<ActionResult> {
  const script = db.select().from(scripts).where(eq(scripts.id, id)).get();
  db.delete(scripts).where(eq(scripts.id, id)).run();
  if (script?.ideaId) {
    // Đưa idea về trạng thái 'approved' để có thể thử lại
    db.update(ideas).set({ status: "approved" }).where(eq(ideas.id, script.ideaId)).run();
  }
  revalidatePath("/scripts");
  revalidatePath("/ideas");
  return { ok: true };
}
