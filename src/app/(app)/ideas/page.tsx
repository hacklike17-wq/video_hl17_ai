import { desc } from "drizzle-orm";
import { db } from "@/db";
import { ideas } from "@/db/schema";
import { KanbanBoard } from "@/components/ideas/kanban-board";
import { CrawlNowButton } from "@/components/ideas/crawl-now-button";
import { ManualIdeaDialog } from "@/components/ideas/manual-idea-dialog";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const all = db
    .select()
    .from(ideas)
    .orderBy(desc(ideas.score), desc(ideas.createdAt))
    .limit(200)
    .all();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ideas</h1>
          <p className="text-sm text-muted-foreground">
            Mining ý tưởng từ TikTok + chấm điểm bằng Claude. Bấm <strong>Approve</strong> để chuyển
            sang Script Gen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CrawlNowButton />
          <ManualIdeaDialog />
        </div>
      </div>

      <KanbanBoard ideas={all} />
    </div>
  );
}
