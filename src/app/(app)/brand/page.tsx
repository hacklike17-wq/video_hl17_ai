import { db } from "@/db";
import { brandProfile } from "@/db/schema";
import { BrandForm } from "./brand-form";

export default async function BrandPage() {
  const rows = db.select().from(brandProfile).all();
  const brand = rows[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hồ sơ thương hiệu</h1>
        <p className="text-sm text-muted-foreground">
          Cấu hình giọng đọc, avatar, chủ đề chính và câu mở đầu mẫu. AI sẽ dùng các thông tin này
          khi tạo kịch bản cho bạn.
        </p>
      </div>
      <BrandForm initial={brand} />
    </div>
  );
}
