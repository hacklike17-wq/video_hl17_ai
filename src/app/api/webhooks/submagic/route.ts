import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobsLog, videos } from "@/db/schema";
import { extractFinalUrl } from "@/services/submagic";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Optional shared-secret check (URL query string)
  const url = new URL(req.url);
  if (env.SUBMAGIC_WEBHOOK_SECRET) {
    const provided = url.searchParams.get("secret") ?? req.headers.get("x-submagic-secret");
    if (provided !== env.SUBMAGIC_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const projectId =
    (payload.id as string | undefined) ??
    (payload.projectId as string | undefined) ??
    (payload.project_id as string | undefined);
  if (!projectId) {
    return NextResponse.json({ error: "missing project id" }, { status: 400 });
  }

  // Look up video by submagicProjectId
  const video = db.select().from(videos).where(eq(videos.submagicProjectId, projectId)).get();
  if (!video) {
    // Submagic may retry — return 200 to prevent retry storms; but log it
    console.warn(`[submagic webhook] unknown project id ${projectId}`);
    return NextResponse.json({ ok: true, noted: "unknown project" });
  }

  const status = (payload.status as string | undefined) ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalUrl = extractFinalUrl(payload as any);

  // Audit log entry
  db.insert(jobsLog)
    .values({
      jobType: "submagic-webhook",
      status:
        status.toLowerCase().includes("complet") || finalUrl
          ? "success"
          : status.toLowerCase().includes("fail")
            ? "failed"
            : "running",
      refTable: "videos",
      refId: video.id,
      payload,
    })
    .run();

  if (
    finalUrl ||
    status === "completed" ||
    status === "complete" ||
    status === "done"
  ) {
    db.update(videos)
      .set({
        finalUrl: finalUrl ?? video.finalUrl,
        status: "pending_review",
      })
      .where(eq(videos.id, video.id))
      .run();
  } else if (status === "failed" || status === "error") {
    db.update(videos)
      .set({
        status: "submagic_failed",
        rejectReason: (payload.error as string | undefined) ?? "Submagic render failed",
      })
      .where(eq(videos.id, video.id))
      .run();
  }
  // Other statuses (processing, etc.) → do nothing yet

  return NextResponse.json({ ok: true });
}

// Cũng chấp nhận GET để verify endpoint còn sống (Submagic UI có thể test)
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "submagic webhook" });
}
