import { db } from "@/db";
import { ideas, scripts, videos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, ScrollText, Video, CheckCircle } from "lucide-react";

async function counts() {
  const [ideasCount] = db
    .select({ c: sql<number>`count(*)` })
    .from(ideas)
    .where(eq(ideas.status, "idea"))
    .all();
  const [scriptsCount] = db
    .select({ c: sql<number>`count(*)` })
    .from(scripts)
    .where(eq(scripts.status, "pending_review"))
    .all();
  const [videosCount] = db
    .select({ c: sql<number>`count(*)` })
    .from(videos)
    .where(eq(videos.status, "pending_review"))
    .all();
  const [publishedCount] = db
    .select({ c: sql<number>`count(*)` })
    .from(videos)
    .where(eq(videos.status, "published"))
    .all();
  return {
    ideas: ideasCount?.c ?? 0,
    scripts: scriptsCount?.c ?? 0,
    videos: videosCount?.c ?? 0,
    published: publishedCount?.c ?? 0,
  };
}

export default async function DashboardPage() {
  const c = await counts();
  const stats = [
    { label: "Ideas chờ duyệt", value: c.ideas, icon: Lightbulb, color: "text-yellow-500" },
    { label: "Scripts pending", value: c.scripts, icon: ScrollText, color: "text-blue-500" },
    { label: "Videos pending", value: c.videos, icon: Video, color: "text-purple-500" },
    { label: "Đã đăng", value: c.published, icon: CheckCircle, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Tổng quan pipeline sản xuất video</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bước tiếp theo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Phase 1 (foundation) đã chạy. Các phase tiếp theo sẽ thêm:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Phase 2 — Ideas: kanban + Apify crawl + Claude scoring</li>
            <li>Phase 3 — Scripts: generate + review</li>
            <li>Phase 4 — Assets: voice / avatar / b-roll qua queue</li>
            <li>Phase 5 — Videos: Submagic webhook + review</li>
            <li>Phase 6 — Publish: Buffer scheduler</li>
            <li>Phase 7 — Deploy: Caddy + cron + hardening</li>
          </ul>
          <p className="pt-2">
            Vào <strong>Brand</strong> để cấu hình profile của bạn trước.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
