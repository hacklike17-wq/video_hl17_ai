import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ideas, scripts } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ScriptEditor } from "./script-editor";

export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  draft: "Bản nháp",
  pending_review: "Chờ duyệt",
  approved: "Đã duyệt",
  rendering: "Đang dựng video",
  done: "Hoàn tất",
  rejected: "Đã từ chối",
} as const;

export default async function ScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = db
    .select({ script: scripts, idea: ideas })
    .from(scripts)
    .leftJoin(ideas, eq(scripts.ideaId, ideas.id))
    .where(eq(scripts.id, id))
    .get();
  if (!row) notFound();

  const { script, idea } = row;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/scripts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Quay lại danh sách kịch bản
      </Link>

      <div>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-2xl font-bold">{idea?.title ?? "(không rõ)"}</h1>
          <Badge variant="outline">v{script.version}</Badge>
          <Badge>{STATUS_LABEL[script.status]}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {idea?.pillar && <Badge variant="outline">{idea.pillar}</Badge>}
          {idea?.score != null && <span>Điểm ý tưởng: {idea.score.toFixed(1)}</span>}
          <span>• Cập nhật {formatDate(script.updatedAt)}</span>
          {idea?.sourceUrl && (
            <a
              href={idea.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Nguồn
            </a>
          )}
        </div>
      </div>

      {idea?.angle && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Góc kể (AI đề xuất từ ý tưởng)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{idea.angle}</p>
          </CardContent>
        </Card>
      )}

      {script.rejectReason && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Lý do từ chối</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{script.rejectReason}</p>
          </CardContent>
        </Card>
      )}

      <ScriptEditor script={script} />
    </div>
  );
}
