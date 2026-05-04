"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Idea } from "@/db/schema";
import {
  setIdeaStatusAction,
  rescoreIdeaAction,
  deleteIdeaAction,
} from "@/app/(app)/ideas/actions";

export function IdeaDetailActions({ idea }: { idea: Idea }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const generate = () => {
    start(async () => {
      const r = await setIdeaStatusAction(idea.id, "approved");
      setMsg(
        r.ok
          ? "Đã chuyển sang trạng thái Đã duyệt. Tính năng tự sinh kịch bản sẽ có ở giai đoạn 3."
          : `Lỗi: ${r.error}`,
      );
    });
  };

  const reject = () => {
    start(async () => {
      await setIdeaStatusAction(idea.id, "rejected");
      router.push("/ideas");
    });
  };

  const rescore = () => {
    start(async () => {
      const r = await rescoreIdeaAction(idea.id);
      setMsg(r.ok ? "Đã yêu cầu chấm lại" : `Lỗi: ${r.error}`);
    });
  };

  const remove = () => {
    if (!confirm("Xoá ý tưởng này?")) return;
    start(async () => {
      await deleteIdeaAction(idea.id);
      router.push("/ideas");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      {idea.status === "idea" && (
        <Button onClick={generate} disabled={pending}>
          <Sparkles className="h-4 w-4" /> Duyệt & tạo kịch bản
        </Button>
      )}
      <Button onClick={rescore} variant="outline" disabled={pending}>
        <RefreshCw className="h-4 w-4" /> Chấm lại
      </Button>
      {idea.status !== "rejected" && (
        <Button onClick={reject} variant="outline" disabled={pending}>
          <X className="h-4 w-4" /> Từ chối
        </Button>
      )}
      <Button onClick={remove} variant="ghost" disabled={pending} className="ml-auto text-destructive">
        <Trash2 className="h-4 w-4" /> Xoá
      </Button>
      {msg && <span className="basis-full text-sm text-muted-foreground">{msg}</span>}
    </div>
  );
}
