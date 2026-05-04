"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { crawlIdeasNowAction } from "@/app/(app)/ideas/actions";

export function CrawlNowButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const handle = () => {
    setMsg(null);
    start(async () => {
      const r = await crawlIdeasNowAction();
      setMsg(r.ok ? r.message ?? "Đã đưa vào hàng đợi" : `Lỗi: ${r.error}`);
      setTimeout(() => setMsg(null), 5000);
    });
  };

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <Button onClick={handle} disabled={pending} variant="outline" size="sm">
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        Quét ngay
      </Button>
    </div>
  );
}
