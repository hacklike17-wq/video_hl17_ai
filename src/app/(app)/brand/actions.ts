"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brandProfile } from "@/db/schema";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Tên thương hiệu bắt buộc"),
  voiceIdElevenLabs: z.string().optional(),
  voiceIdArgil: z.string().optional(),
  avatarIdArgil: z.string().optional(),
  voiceStyle: z.string().optional(),
  signaturePhrases: z.string().optional(),
  contentPillars: z.string().optional(),
  bannedTopics: z.string().optional(),
  primaryColor: z.string().optional(),
  submagicTemplateId: z.string().optional(),
  hookExamples: z.string().optional(),
  scriptExamples: z.string().optional(),
  defaultCta: z.string().optional(),
});

export type BrandState = { error?: string; success?: boolean } | undefined;

export async function saveBrandAction(_prev: BrandState, formData: FormData): Promise<BrandState> {
  const data = Object.fromEntries(formData) as Record<string, string>;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { id, ...values } = parsed.data;
  const cleaned = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]),
  ) as typeof values;

  if (id) {
    db.update(brandProfile).set(cleaned).where(eq(brandProfile.id, id)).run();
  } else {
    db.insert(brandProfile).values({ ...cleaned, name: cleaned.name!, isActive: true }).run();
  }

  revalidatePath("/brand");
  return { success: true };
}
