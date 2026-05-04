import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">Sắp có — đang chờ phase tương ứng triển khai.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming in {phase}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Phase này sẽ thêm UI và logic cho mục <strong>{title}</strong>. Xem chi tiết trong{" "}
          <code className="rounded bg-muted px-1 py-0.5">PLAN.md</code>.
        </CardContent>
      </Card>
    </div>
  );
}
