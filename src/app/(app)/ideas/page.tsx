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

      <KanbanBoard ideas={all} />
    </div>
  );
}
