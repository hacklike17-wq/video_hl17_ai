"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw, Save, X, Trash2, CheckCircle } from "lucide-react";
import type { Script } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  approveScriptAction,
  deleteScriptAction,
  regenerateScriptAction,
  rejectScriptAction,
  updateScriptAction,
} from "../actions";

const SECTIONS: { key: "hook" | "setup" | "body" | "payoff" | "cta"; label: string; hint: string; rows: number }[] = [
  { key: "hook", label: "Hook (3-5 giây)", hint: "Câu mở đầu cực ngắn, tạo lý do để xem tiếp", rows: 2 },
  { key: "setup", label: "Setup (5-10 giây)", hint: "Thiết lập bối cảnh, nêu vấn đề/câu hỏi", rows: 3 },
  { key: "body", label: "Body (20-30 giây)", hint: "Nội dung chính, dẫn chứng, ví dụ cụ thể", rows: 6 },
  { key: "payoff", label: "Payoff (5-10 giây)", hint: "Kết luận, twist, hoặc insight đáng nhớ", rows: 3 },
  { key: "cta", label: "CTA (3-5 giây)", hint: "Câu kêu gọi hành động", rows: 2 },
];

export function ScriptEditor({ script }: { script: Script }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isLocked = script.status === "approved" || script.status === "done" || script.status === "rendering";

  const onSubmit = (formData: FormData) => {
    setErr(null);
    setMsg(null);
    start(async () => {
      const r = await updateScriptAction(script.id, formData);
      if (r.ok) setMsg(r.message ?? "Đã lưu");
      else setErr(r.error ?? "Lỗi không xác định");
    });
  };

  const approve = () => {
    if (!confirm("Duyệt kịch bản này? Bước tạo voice/avatar/video sẽ tự chạy ở giai đoạn sau.")) return;
    setErr(null);
    setMsg(null);
    start(async () => {
      const r = await approveScriptAction(script.id);
      if (r.ok) setMsg(r.message ?? "Đã duyệt");
      else setErr(r.error ?? "Lỗi");
    });
  };

  const reject = () => {
    const reason = prompt("Lý do từ chối (tuỳ chọn):") ?? "";
    setErr(null);
    setMsg(null);
    start(async () => {
      await rejectScriptAction(script.id, reason);
      router.push("/scripts");
    });
  };

  const regenerate = () => {
    if (!confirm("Tạo lại kịch bản? Phiên bản hiện tại sẽ bị ghi đè.")) return;
    setErr(null);
    setMsg(null);
    start(async () => {
      const r = await regenerateScriptAction(script.id);
      if (r.ok) {
        setMsg("Đã yêu cầu tạo lại — quay lại trang này sau ~15 giây để xem phiên bản mới.");
      } else setErr(r.error ?? "Lỗi");
    });
  };

  const remove = () => {
    if (!confirm("Xoá kịch bản này? Ý tưởng sẽ quay lại trạng thái 'Đã duyệt'.")) return;
    start(async () => {
      await deleteScriptAction(script.id);
      router.push("/scripts");
    });
  };

  return (
    <form action={onSubmit} className="space-y-6">
      {SECTIONS.map((s) => (
        <Card key={s.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{s.label}</CardTitle>
            <p className="text-xs text-muted-foreground">{s.hint}</p>
          </CardHeader>
          <CardContent>
            <Textarea
              name={s.key}
              defaultValue={script[s.key] ?? ""}
              rows={s.rows}
              disabled={isLocked}
              className="text-sm leading-relaxed"
            />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">B-roll prompts</CardTitle>
          <p className="text-xs text-muted-foreground">
            Mỗi dòng là 1 prompt tiếng Anh để tìm video stock trên Pexels (3-5 cảnh).
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            name="brollPrompts"
            defaultValue={(script.brollPrompts ?? []).join("\n")}
            rows={6}
            disabled={isLocked}
            className="text-sm font-mono"
            placeholder="developer typing code at night&#10;lo-fi office desk with laptop&#10;..."
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-2 flex flex-wrap items-center gap-2 border-t bg-background/95 px-2 py-3 backdrop-blur">
        {!isLocked && (
          <Button type="submit" disabled={pending} variant="outline">
            <Save className="h-4 w-4" /> {pending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        )}
        <Button type="button" onClick={regenerate} variant="outline" disabled={pending}>
          <RefreshCw className="h-4 w-4" /> Tạo lại
        </Button>
        {!isLocked && (
          <Button type="button" onClick={reject} variant="outline" disabled={pending}>
            <X className="h-4 w-4" /> Từ chối
          </Button>
        )}
        {!isLocked && (
          <Button type="button" onClick={approve} disabled={pending}>
            <CheckCircle className="h-4 w-4" /> Duyệt &amp; tạo video
          </Button>
        )}
        <Button
          type="button"
          onClick={remove}
          variant="ghost"
          disabled={pending}
          className="ml-auto text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Xoá
        </Button>
        {(msg || err) && (
          <div className="basis-full text-sm">
            {msg && <span className="text-green-500">{msg}</span>}
            {err && <span className="text-destructive">{err}</span>}
          </div>
        )}
      </div>
    </form>
  );
}
