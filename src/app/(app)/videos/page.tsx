import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ideas, scripts, videos, type Video } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle, Film, PlayCircle } from "lucide-react";
import { IdeasAutoRefresh } from "@/components/ideas/auto-refresh";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<Video["status"], string> = {
  generating_assets: "Đang tạo tài nguyên",
  assembling: "Đang ghép video",
  rendering: "Đang dựng",
  pending_review: "Chờ duyệt",
  approved: "Đã duyệt",
  scheduled: "Đã hẹn lịch",
  published: "Đã đăng",
  rejected: "Đã từ chối",
  argil_failed: "Lỗi giọng đọc",
  submagic_failed: "Lỗi ghép video",
};

const STATUS_VARIANT: Record<Video["status"], "default" | "secondary" | "warning" | "success" | "destructive"> = {
  generating_assets: "secondary",
  assembling: "secondary",
  rendering: "secondary",
  pending_review: "warning",
  approved: "default",
  scheduled: "default",
  published: "success",
  rejected: "destructive",
  argil_failed: "destructive",
  submagic_failed: "destructive",
};

const STATUS_ICON: Record<Video["status"], typeof Loader2> = {
  generating_assets: Loader2,
  assembling: Loader2,
  rendering: Loader2,
  pending_review: PlayCircle,
  approved: CheckCircle2,
  scheduled: CheckCircle2,
  published: CheckCircle2,
  rejected: AlertCircle,
  argil_failed: AlertCircle,
  submagic_failed: AlertCircle,
};

export default async function VideosPage() {
  const rows = db
    .select({ video: videos, script: scripts, idea: ideas })
    .from(videos)
    .leftJoin(scripts, eq(videos.scriptId, scripts.id))
    .leftJoin(ideas, eq(scripts.ideaId, ideas.id))
    .orderBy(desc(videos.updatedAt))
    .limit(200)
    .all();

  const groups = new Map<Video["status"], typeof rows>();
  for (const r of rows) {
    const list = groups.get(r.video.status) ?? [];
    list.push(r);
    groups.set(r.video.status, list);
  }
  const order: Video["status"][] = [
    "generating_assets",
    "assembling",
    "pending_review",
    "approved",
    "scheduled",
    "published",
    "argil_failed",
    "submagic_failed",
    "rejected",
  ];

  const hasInFlight = rows.some(
    (r) =>
      r.video.status === "generating_assets" ||
      r.video.status === "assembling" ||
      r.video.status === "rendering",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Video</h1>
        <p className="text-sm text-muted-foreground">
          Sau khi duyệt kịch bản, hệ thống sẽ tự tạo giọng đọc và tìm b-roll. Khi đủ tài nguyên,
          video chuyển sang <strong>Chờ duyệt</strong>.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Chưa có video nào. Vào{" "}
            <Link href="/scripts" className="text-primary hover:underline">
              Kịch bản
            </Link>{" "}
            chọn kịch bản đã duyệt để tạo video.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {order.map((status) => {
            const items = groups.get(status);
            if (!items?.length) return null;
            const Icon = STATUS_ICON[status];
            const animated = status === "generating_assets" || status === "assembling" || status === "rendering";
            return (
              <section key={status}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Icon className={`h-4 w-4 ${animated ? "animate-spin" : ""}`} />
                  {STATUS_LABEL[status]}
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{items.length}</span>
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {items.map(({ video, idea }) => {
                    const hasVoice = !!video.voiceUrl;
                    const hasBroll = !!(video.brollUrls && video.brollUrls.length);
                    return (
                      <Link key={video.id} href={`/videos/${video.id}`}>
                        <Card className="transition-colors hover:border-primary/50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-medium line-clamp-2">{idea?.title ?? "(không rõ)"}</div>
                              <Badge variant={STATUS_VARIANT[video.status]}>{STATUS_LABEL[video.status]}</Badge>
                            </div>

                            <div className="mt-3 flex items-center gap-3 text-xs">
                              <span className={hasVoice ? "text-green-500" : "text-muted-foreground"}>
                                {hasVoice ? "✓" : "○"} Giọng đọc
                              </span>
                              <span className={hasBroll ? "text-green-500" : "text-muted-foreground"}>
                                {hasBroll
                                  ? `✓ B-roll (${(video.brollUrls ?? []).length})`
                                  : "○ B-roll"}
                              </span>
                              {video.finalUrl && (
                                <span className="text-green-500 inline-flex items-center gap-1">
                                  <Film className="h-3 w-3" /> Final
                                </span>
                              )}
                              <span className="ml-auto text-muted-foreground">
                                {formatDate(video.updatedAt)}
                              </span>
                            </div>

                            {video.rejectReason && (
                              <p className="mt-2 line-clamp-2 text-xs text-destructive/80">
                                {video.rejectReason}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {hasInFlight && <IdeasAutoRefresh intervalMs={6000} />}
    </div>
  );
}
