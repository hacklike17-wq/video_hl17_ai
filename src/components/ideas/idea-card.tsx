"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Music2, Youtube, Instagram, Twitter, FileText, Eye, ExternalLink, Trash2 } from "lucide-react";
import type { Idea } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setIdeaStatusAction, deleteIdeaAction } from "@/app/(app)/ideas/actions";
import { generateScriptForIdeaAction } from "@/app/(app)/scripts/actions";

const PLATFORM_ICON = {
  tiktok: Music2,
  youtube: Youtube,
  instagram: Instagram,
  twitter: Twitter,
  manual: FileText,
} as const;

const NEXT_STATUS: Record<Idea["status"], { label: string; next: Idea["status"] } | null> = {
  idea: { label: "Duyệt", next: "approved" },
  approved: { label: "→ Tạo kịch bản", next: "script_gen" },
  script_gen: { label: "Đánh dấu xong", next: "done" },
  done: null,
  rejected: { label: "Khôi phục", next: "idea" },
};

export function IdeaCard({ idea }: { idea: Idea }) {
  const [pending, startTransition] = useTransition();
  const Icon = PLATFORM_ICON[idea.sourcePlatform ?? "manual"] ?? FileText;
  const next = NEXT_STATUS[idea.status];

  const advance = () => {
    if (!next) return;
    startTransition(async () => {
      // Nếu chuyển từ 'approved' → 'script_gen' thì gọi action sinh kịch bản (queue job)
      if (idea.status === "approved" && next.next === "script_gen") {
        await generateScriptForIdeaAction(idea.id);
      } else {
        await setIdeaStatusAction(idea.id, next.next);
      }
    });
  };
  const reject = () => {
    startTransition(async () => {
      await setIdeaStatusAction(idea.id, "rejected");
    });
  };
  const remove = () => {
    if (!confirm("Xoá ý tưởng này?")) return;
    startTransition(async () => {
      await deleteIdeaAction(idea.id);
    });
  };

  return (
    <div className="group rounded-lg border bg-card p-3 text-sm shadow-sm hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <Link href={`/ideas/${idea.id}`} className="flex-1 min-w-0">
          <div className="font-medium line-clamp-2">{idea.title}</div>
        </Link>
        {idea.score !== null && idea.score !== undefined && (
          <Badge variant={idea.score >= 7 ? "success" : idea.score >= 4 ? "warning" : "secondary"}>
            {idea.score.toFixed(1)}
          </Badge>
        )}
      </div>

      {idea.hookText && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{idea.hookText}</p>
      )}

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {idea.viewCount != null && (
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatCount(idea.viewCount)}
          </span>
        )}
        {idea.pillar && <Badge variant="outline">{idea.pillar}</Badge>}
        {idea.sourceUrl && (
          <a
            href={idea.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {next && (
          <Button size="sm" variant="default" onClick={advance} disabled={pending} className="h-7 text-xs">
            {next.label}
          </Button>
        )}
        {idea.status !== "rejected" && idea.status !== "done" && (
          <Button
            size="sm"
            variant="outline"
            onClick={reject}
            disabled={pending}
            className="h-7 text-xs"
          >
            Từ chối
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={remove}
          disabled={pending}
          className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-destructive"
          title="Xoá"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
