import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">Sắp có — đang chờ giai đoạn tương ứng triển khai.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sẽ có ở giai đoạn {phase.replace(/^Phase\s*/i, "")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Giai đoạn này sẽ bổ sung giao diện và xử lý cho phần <strong>{title}</strong>.
        </CardContent>
      </Card>
    </div>
  );
}
