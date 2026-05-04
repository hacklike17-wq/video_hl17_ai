import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { scripts, ideas, type Script } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<Script["status"], string> = {
  draft: "Bản nháp",
  pending_review: "Chờ duyệt",
  approved: "Đã duyệt",
  rendering: "Đang dựng video",
  done: "Hoàn tất",
  rejected: "Đã từ chối",
};

const STATUS_VARIANT: Record<Script["status"], "default" | "secondary" | "warning" | "success" | "destructive"> = {
  draft: "secondary",
  pending_review: "warning",
  approved: "default",
  rendering: "secondary",
  done: "success",
  rejected: "destructive",
};

export default async function ScriptsPage() {
  // Join scripts with ideas to get the title
  const rows = db
    .select({
      script: scripts,
      ideaTitle: ideas.title,
      ideaScore: ideas.score,
    })
    .from(scripts)
    .leftJoin(ideas, eq(scripts.ideaId, ideas.id))
    .orderBy(desc(scripts.updatedAt))
    .limit(200)
    .all();

  const groups: Record<Script["status"], typeof rows> = {
    pending_review: [],
    approved: [],
    rendering: [],
    done: [],
    rejected: [],
    draft: [],
  };
  for (const r of rows) groups[r.script.status].push(r);

  const order: Script["status"][] = ["pending_review", "approved", "rendering", "done", "rejected", "draft"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kịch bản</h1>
        <p className="text-sm text-muted-foreground">
          Kịch bản do AI sinh từ ý tưởng. Bấm <strong>Chờ duyệt</strong> để xem và chỉnh sửa.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Chưa có kịch bản nào. Vào{" "}
            <Link href="/ideas" className="text-primary hover:underline">
              Ý tưởng
            </Link>
            , bấm <strong>Duyệt &amp; tạo kịch bản</strong> trên 1 ý tưởng để bắt đầu.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {order.map((status) => {
            const items = groups[status];
            if (items.length === 0) return null;
            return (
              <section key={status}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  {STATUS_LABEL[status]}
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{items.length}</span>
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {items.map(({ script, ideaTitle, ideaScore }) => (
                    <Link key={script.id} href={`/scripts/${script.id}`}>
                      <Card className="transition-colors hover:border-primary/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium line-clamp-2">{ideaTitle ?? "(không rõ ý tưởng)"}</div>
                            <Badge variant={STATUS_VARIANT[script.status]}>{STATUS_LABEL[script.status]}</Badge>
                          </div>
                          {script.hook && (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Hook:</span> {script.hook}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>v{script.version}</span>
                            {ideaScore != null && <span>điểm {ideaScore.toFixed(1)}</span>}
                            <span className="ml-auto">{formatDate(script.updatedAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
