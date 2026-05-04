import { logoutAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function TopBar({ email }: { email: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="text-sm text-muted-foreground">Pipeline tự động sản xuất video ngắn</div>
      <div className="flex items-center gap-3">
        <span className="text-sm">{email}</span>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="icon" title="Đăng xuất">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
