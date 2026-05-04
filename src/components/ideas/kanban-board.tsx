import type { Idea } from "@/db/schema";
import { IdeaCard } from "./idea-card";

const COLUMNS: { key: Idea["status"]; label: string; tint: string }[] = [
  { key: "idea", label: "Idea", tint: "border-yellow-500/30" },
  { key: "approved", label: "Approved", tint: "border-blue-500/30" },
  { key: "script_gen", label: "Script Gen", tint: "border-purple-500/30" },
  { key: "done", label: "Done", tint: "border-green-500/30" },
  { key: "rejected", label: "Rejected", tint: "border-red-500/30" },
];

export function KanbanBoard({ ideas }: { ideas: Idea[] }) {
  const grouped = COLUMNS.reduce<Record<Idea["status"], Idea[]>>(
    (acc, col) => {
      acc[col.key] = [];
      return acc;
    },
    { idea: [], approved: [], script_gen: [], done: [], rejected: [] },
  );
  for (const i of ideas) grouped[i.status].push(i);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {COLUMNS.map((col) => {
        const items = grouped[col.key];
        return (
          <div
            key={col.key}
            className={`flex flex-col rounded-lg border ${col.tint} bg-card/50 p-3 min-h-[400px]`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
              {items.length === 0 && (
                <div className="rounded-md border border-dashed border-muted-foreground/20 p-4 text-center text-xs text-muted-foreground">
                  (trống)
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
