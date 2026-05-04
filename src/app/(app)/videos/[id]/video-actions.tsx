"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, X, Trash2 } from "lucide-react";
import type { Video } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  deleteVideoAction,
  regenerateAssetsAction,
  rejectVideoAction,
} from "../actions";

export function VideoActions({ video }: { video: Video }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const reject = () => {
    const reason = prompt("Lý do từ chối:") ?? "";
    start(async () => {
      await rejectVideoAction(video.id, reason);
      router.push("/videos");
    });
  };

  const regenerate = () => {
    if (!confirm("Tạo lại giọng đọc + b-roll? Tài nguyên cũ sẽ bị thay thế.")) return;
    start(async () => {
      const r = await regenerateAssetsAction(video.id);
      setMsg(r.ok ? r.message ?? "Đang tạo lại" : `Lỗi: ${r.error}`);
    });
  };

  const remove = () => {
    if (!confirm("Xoá hẳn video này? Kịch bản sẽ quay về trạng thái Chờ duyệt.")) return;
    start(async () => {
      await deleteVideoAction(video.id);
      router.push("/videos");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      <Button onClick={regenerate} variant="outline" disabled={pending}>
        <RefreshCw className="h-4 w-4" /> Tạo lại tài nguyên
      </Button>
      <Button onClick={reject} variant="outline" disabled={pending}>
        <X className="h-4 w-4" /> Từ chối
      </Button>
      <Button onClick={remove} variant="ghost" disabled={pending} className="ml-auto text-destructive">
        <Trash2 className="h-4 w-4" /> Xoá
      </Button>
      {msg && <span className="basis-full text-sm text-muted-foreground">{msg}</span>}
    </div>
  );
}
