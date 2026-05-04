import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { ideasQueue } from "@/jobs/queue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const provided =
    req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");

  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (provided !== env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const job = await ideasQueue.add("crawl-ideas", {
    type: "crawl-ideas",
    data: { limit: 20 },
  });

  return NextResponse.json({ ok: true, jobId: job.id });
}
