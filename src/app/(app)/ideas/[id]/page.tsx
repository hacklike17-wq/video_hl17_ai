import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { ideas } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { IdeaDetailActions } from "./detail-actions";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = db.select().from(ideas).where(eq(ideas.id, id)).get();
  if (!idea) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/ideas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
      </Link>

      <div>
        <div className="flex items-start gap-3">
          <h1 className="text-2xl font-bold flex-1">{idea.title}</h1>
          {idea.score !== null && (
            <Badge variant={idea.score! >= 7 ? "success" : "secondary"} className="mt-1">
              Score {idea.score!.toFixed(1)}
            </Badge>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{idea.status}</Badge>
          {idea.pillar && <Badge variant="outline">{idea.pillar}</Badge>}
          <span>•</span>
          <span>{idea.sourcePlatform}</span>
          {idea.viewCount != null && <span>• {idea.viewCount.toLocaleString()} lượt xem</span>}
          <span>• Quét lúc {formatDate(idea.crawledDate ?? idea.createdAt)}</span>
        </div>
        {idea.sourceUrl && (
          <a
            href={idea.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> {idea.sourceUrl}
          </a>
        )}
      </div>

      {idea.hookText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Câu mở đầu / Mô tả gốc</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{idea.hookText}</p>
          </CardContent>
        </Card>
      )}

      {idea.angle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Góc kể (AI đề xuất)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{idea.angle}</p>
          </CardContent>
        </Card>
      )}

      {idea.rawData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dữ liệu gốc</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs">
              {JSON.stringify(idea.rawData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <IdeaDetailActions idea={idea} />
    </div>
  );
}
