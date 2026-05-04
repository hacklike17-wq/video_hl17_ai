import { db } from "@/db";
import { brandProfile } from "@/db/schema";
import { BrandForm } from "./brand-form";

export default async function BrandPage() {
  const rows = db.select().from(brandProfile).all();
  const brand = rows[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Brand Profile</h1>
        <p className="text-sm text-muted-foreground">
          Cấu hình thương hiệu — voice, avatar, content pillars, hook examples. Claude sẽ dùng
          các thông tin này khi sinh script.
        </p>
      </div>
      <BrandForm initial={brand} />
    </div>
  );
}
