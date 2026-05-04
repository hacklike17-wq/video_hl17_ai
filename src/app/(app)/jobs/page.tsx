import { desc } from "drizzle-orm";
import { db } from "@/db";
import { jobsLog } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { IdeasAutoRefresh } from "@/components/ideas/auto-refresh";

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  queued: "secondary",
  running: "secondary",
  success: "success",
  failed: "destructive",
} as const;

const STATUS_LABEL: Record<string, string> = {
  queued: "Trong hàng đợi",
  running: "Đang chạy",
  success: "Thành công",
  failed: "Thất bại",
};

const JOB_LABEL: Record<string, string> = {
  "crawl-ideas": "Quét ý tưởng",
  "score-idea": "Chấm điểm ý tưởng",
  "generate-script": "Tạo kịch bản",
  "generate-voice": "Tạo giọng đọc",
  "fetch-broll": "Tìm b-roll",
};

export default async function JobsPage() {
  const rows = db.select().from(jobsLog).orderBy(desc(jobsLog.createdAt)).limit(100).all();
  const hasRunning = rows.some((j) => j.status === "running" || j.status === "queued");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tác vụ</h1>
        <p className="text-sm text-muted-foreground">
          100 tác vụ gần nhất. Tự động làm mới mỗi 6 giây nếu có tác vụ đang chạy.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Chưa có tác vụ nào.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Loại</th>
                  <th className="px-4 py-2 font-medium">Trạng thái</th>
                  <th className="px-4 py-2 font-medium">Thời gian</th>
                  <th className="px-4 py-2 font-medium">Lỗi</th>
                  <th className="px-4 py-2 font-medium">Tạo lúc</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => (
                  <tr key={j.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs">
                      {JOB_LABEL[j.jobType] ?? j.jobType}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={STATUS_VARIANT[j.status as keyof typeof STATUS_VARIANT] ?? "secondary"}>
                        {STATUS_LABEL[j.status] ?? j.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {j.durationMs != null ? `${(j.durationMs / 1000).toFixed(1)}s` : "-"}
                    </td>
                    <td className="px-4 py-2 text-xs text-destructive max-w-md truncate">
                      {j.error ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {formatDate(j.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {hasRunning && <IdeasAutoRefresh intervalMs={6000} />}
    </div>
  );
}
