import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Video AI</h1>
          <p className="text-sm text-muted-foreground">Đăng nhập để tiếp tục</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
