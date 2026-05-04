import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video AI",
  description: "AI-powered short-form video pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
