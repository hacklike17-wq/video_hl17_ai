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
      // Phase 3 sẽ implement: tạo job sinh script + redirect đến script.
      // Phase 2 chỉ chuyển status để tracking.
      const r = await setIdeaStatusAction(idea.id, "approved");
      setMsg(
        r.ok
          ? "Đã chuyển sang Approved. Phase 3 sẽ tự sinh script."
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
      setMsg(r.ok ? "Đã queue rescore" : `Lỗi: ${r.error}`);
    });
  };

  const remove = () => {
    if (!confirm("Xoá idea này?")) return;
    start(async () => {
      await deleteIdeaAction(idea.id);
      router.push("/ideas");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      {idea.status === "idea" && (
        <Button onClick={generate} disabled={pending}>
          <Sparkles className="h-4 w-4" /> Approve & Generate Script
        </Button>
      )}
      <Button onClick={rescore} variant="outline" disabled={pending}>
        <RefreshCw className="h-4 w-4" /> Rescore
      </Button>
      {idea.status !== "rejected" && (
        <Button onClick={reject} variant="outline" disabled={pending}>
          <X className="h-4 w-4" /> Reject
        </Button>
      )}
      <Button onClick={remove} variant="ghost" disabled={pending} className="ml-auto text-destructive">
        <Trash2 className="h-4 w-4" /> Xoá
      </Button>
      {msg && <span className="basis-full text-sm text-muted-foreground">{msg}</span>}
    </div>
  );
}
