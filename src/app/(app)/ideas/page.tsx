import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ideas, scripts, jobsLog } from "@/db/schema";
import { KanbanBoard, type IdeaProgress } from "@/components/ideas/kanban-board";
import { CrawlNowButton } from "@/components/ideas/crawl-now-button";
import { ManualIdeaDialog } from "@/components/ideas/manual-idea-dialog";
import { IdeasAutoRefresh } from "@/components/ideas/auto-refresh";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const all = db
    .select()
    .from(ideas)
    .orderBy(desc(ideas.score), desc(ideas.createdAt))
    .limit(200)
    .all();

  // For ideas currently in 'script_gen', look up the latest script + last
  // generate-script job to surface progress on the card.
  const scriptGenIds = all.filter((i) => i.status === "script_gen").map((i) => i.id);
  const progressMap = new Map<string, IdeaProgress>();

  if (scriptGenIds.length) {
    const scriptRows = db
      .select({ id: scripts.id, ideaId: scripts.ideaId, status: scripts.status })
      .from(scripts)
      .where(inArray(scripts.ideaId, scriptGenIds))
      .all();
    for (const s of scriptRows) {
      progressMap.set(s.ideaId, { scriptId: s.id, scriptStatus: s.status });
    }

    const jobRows = db
      .select({
        refId: jobsLog.refId,
        status: jobsLog.status,
        error: jobsLog.error,
        createdAt: jobsLog.createdAt,
      })
      .from(jobsLog)
      .where(
        and(eq(jobsLog.jobType, "generate-script"), inArray(jobsLog.refId, scriptGenIds)),
      )
      .orderBy(desc(jobsLog.createdAt))
      .all();
    const seen = new Set<string>();
    for (const j of jobRows) {
      if (!j.refId || seen.has(j.refId)) continue;
      seen.add(j.refId);
      const cur = progressMap.get(j.refId) ?? {};
      progressMap.set(j.refId, {
        ...cur,
        jobStatus: j.status,
        jobError: j.error ?? null,
      });
    }
    // Ideas without any log entry yet → still queued
    for (const id of scriptGenIds) {
      if (!progressMap.has(id)) progressMap.set(id, { jobStatus: "queued" });
    }
  }

  const hasInFlight = Array.from(progressMap.values()).some(
    (p) => p.jobStatus === "queued" || p.jobStatus === "running",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ý tưởng</h1>
          <p className="text-sm text-muted-foreground">
            Quét ý tưởng từ TikTok và chấm điểm bằng AI. Bấm <strong>Duyệt</strong> để chuyển sang
            bước tạo kịch bản.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CrawlNowButton />
          <ManualIdeaDialog />
        </div>
      </div>

      <KanbanBoard ideas={all} progressMap={Object.fromEntries(progressMap)} />
      {hasInFlight && <IdeasAutoRefresh intervalMs={6000} />}
    </div>
  );
}
