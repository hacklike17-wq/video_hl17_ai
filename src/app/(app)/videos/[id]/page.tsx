import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { ideas, jobsLog, scripts, videos } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { IdeasAutoRefresh } from "@/components/ideas/auto-refresh";
import { VideoActions } from "./video-actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL = {
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
} as const;

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = db
    .select({ video: videos, script: scripts, idea: ideas })
    .from(videos)
    .leftJoin(scripts, eq(videos.scriptId, scripts.id))
    .leftJoin(ideas, eq(scripts.ideaId, ideas.id))
    .where(eq(videos.id, id))
    .get();
  if (!row) notFound();
  const { video, script, idea } = row;

  // Fetch latest 5 job logs liên quan kịch bản này
  const recentJobs = video.scriptId
    ? db
        .select()
        .from(jobsLog)
        .where(and(eq(jobsLog.refTable, "scripts"), eq(jobsLog.refId, video.scriptId)))
        .orderBy(desc(jobsLog.createdAt))
        .limit(8)
        .all()
    : [];

  const inFlight =
    video.status === "generating_assets" ||
    video.status === "assembling" ||
    video.status === "rendering";

  const hasVoice = !!video.voiceUrl;
  const hasBroll = !!(video.brollUrls && video.brollUrls.length);
  const brollCount = video.brollUrls?.length ?? 0;
  const requestedBroll = script?.brollPrompts?.length ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        href="/videos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Quay lại danh sách video
      </Link>

      <div>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-2xl font-bold">{idea?.title ?? "(không rõ)"}</h1>
          <Badge>{STATUS_LABEL[video.status]}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {script && <Badge variant="outline">Kịch bản v{script.version}</Badge>}
          {idea?.pillar && <Badge variant="outline">{idea.pillar}</Badge>}
          <span>• Cập nhật {formatDate(video.updatedAt)}</span>
        </div>
      </div>

      {video.rejectReason && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Ghi chú</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{video.rejectReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Asset progress */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {hasVoice ? "✓" : inFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : "○"}
              Giọng đọc (ElevenLabs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasVoice ? (
              <audio controls src={video.voiceUrl!} className="w-full" preload="metadata" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {inFlight ? "AI đang đọc kịch bản…" : "Chưa có"}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {hasBroll ? "✓" : inFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : "○"}
              B-roll (Pexels)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {brollCount}/{requestedBroll} cảnh đã tìm
            </p>
          </CardHeader>
          <CardContent>
            {hasBroll ? (
              <div className="grid grid-cols-2 gap-2">
                {(video.brollUrls ?? []).slice(0, 6).map((url, i) => (
                  <video
                    key={i}
                    src={url}
                    controls
                    muted
                    preload="metadata"
                    className="w-full rounded border bg-black"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {inFlight ? "Đang tìm video stock…" : "Chưa có"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Final video (Phase 5) */}
      {video.finalUrl && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Video cuối</CardTitle>
          </CardHeader>
          <CardContent>
            <video src={video.finalUrl} controls className="w-full max-h-[600px] rounded border bg-black" />
          </CardContent>
        </Card>
      )}

      {/* Recent jobs */}
      {recentJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tác vụ gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {recentJobs.map((j) => (
                <li key={j.id} className="flex items-center gap-2">
                  <span
                    className={
                      j.status === "success"
                        ? "text-green-500"
                        : j.status === "failed"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {j.status === "success" ? "✓" : j.status === "failed" ? "✗" : "⏳"}
                  </span>
                  <span className="font-mono">{j.jobType}</span>
                  {j.durationMs != null && (
                    <span className="text-muted-foreground">{(j.durationMs / 1000).toFixed(1)}s</span>
                  )}
                  {j.error && <span className="text-destructive line-clamp-1">{j.error}</span>}
                  <span className="ml-auto text-muted-foreground">{formatDate(j.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <VideoActions video={video} />

      {inFlight && <IdeasAutoRefresh intervalMs={5000} />}
    </div>
  );
}
