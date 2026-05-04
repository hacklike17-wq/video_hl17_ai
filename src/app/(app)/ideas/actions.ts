"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ideas, brandProfile } from "@/db/schema";
import { ideasQueue } from "@/jobs/queue";

export type ActionResult = { ok: boolean; error?: string; message?: string };

const idSchema = z.object({ id: z.string().min(1) });

export async function setIdeaStatusAction(
  id: string,
  status: "idea" | "approved" | "script_gen" | "done" | "rejected",
): Promise<ActionResult> {
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "ID không hợp lệ" };

  db.update(ideas).set({ status }).where(eq(ideas.id, id)).run();
  revalidatePath("/ideas");
  revalidatePath(`/ideas/${id}`);
  return { ok: true };
}

const manualSchema = z.object({
  title: z.string().min(1, "Title bắt buộc").max(200),
  hookText: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourcePlatform: z.enum(["tiktok", "youtube", "instagram", "twitter", "manual"]).default("manual"),
  pillar: z.string().optional(),
  angle: z.string().optional(),
});

export async function createManualIdeaAction(formData: FormData): Promise<ActionResult> {
  const data = Object.fromEntries(formData) as Record<string, string>;
  const parsed = manualSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const v = parsed.data;
  const brand = db.select().from(brandProfile).limit(1).get();

  db.insert(ideas)
    .values({
      title: v.title,
      hookText: v.hookText || null,
      sourceUrl: v.sourceUrl || null,
      sourcePlatform: v.sourcePlatform,
      pillar: v.pillar || null,
      angle: v.angle || null,
      status: "idea",
      brandId: brand?.id ?? null,
    })
    .run();

  revalidatePath("/ideas");
  return { ok: true, message: "Đã tạo idea" };
}

export async function crawlIdeasNowAction(): Promise<ActionResult> {
  try {
    const job = await ideasQueue.add(
      "crawl-ideas",
      { type: "crawl-ideas", data: { limit: 20 } },
      { jobId: `crawl:${Date.now()}` },
    );
    revalidatePath("/jobs");
    return { ok: true, message: `Đã queue job: ${job.id}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function rescoreIdeaAction(id: string): Promise<ActionResult> {
  try {
    await ideasQueue.add(
      "score-idea",
      { type: "score-idea", data: { ideaId: id } },
      { jobId: `score:${id}:${Date.now()}` },
    );
    return { ok: true, message: "Đã queue rescore" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteIdeaAction(id: string): Promise<ActionResult> {
  db.delete(ideas).where(eq(ideas.id, id)).run();
  revalidatePath("/ideas");
  return { ok: true };
}
