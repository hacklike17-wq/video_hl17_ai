import { env } from "../lib/env";

const BASE = "https://api.submagic.co/v1";

export type SubmagicProject = {
  id: string;
  status: string; // "uploading" | "processing" | "completed" | "failed" | ...
  title?: string;
  language?: string;
  templateName?: string;
  webhookUrl?: string | null;
  videoUrl?: string;
  downloadUrl?: string;
  outputUrl?: string;
  createdAt?: string;
  [k: string]: unknown;
};

function getKey(): string {
  if (!env.SUBMAGIC_API_KEY) throw new Error("SUBMAGIC_API_KEY chưa cấu hình.");
  return env.SUBMAGIC_API_KEY;
}

/**
 * Tạo 1 project Submagic — gửi videoUrl, Submagic sẽ download, transcribe,
 * thêm caption + animation, rồi POST callback về webhookUrl khi xong.
 */
export async function createSubmagicProject(opts: {
  title: string;
  videoUrl: string;
  language?: string;
  templateName?: string;
  webhookUrl?: string;
  magicBrolls?: boolean;
  magicZooms?: boolean;
}): Promise<SubmagicProject> {
  const body = {
    title: opts.title.slice(0, 100),
    videoUrl: opts.videoUrl,
    language: opts.language ?? "vi",
    templateName: opts.templateName ?? env.SUBMAGIC_TEMPLATE_NAME,
    webhookUrl: opts.webhookUrl,
    magicBrolls: opts.magicBrolls ?? false,
    magicZooms: opts.magicZooms ?? false,
  };

  const res = await fetch(`${BASE}/projects`, {
    method: "POST",
    headers: {
      "x-api-key": getKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Submagic createProject lỗi ${res.status}: ${t.slice(0, 300)}`);
  }
  return (await res.json()) as SubmagicProject;
}

/** Poll project state — fallback nếu webhook không tới. */
export async function getSubmagicProject(id: string): Promise<SubmagicProject> {
  const res = await fetch(`${BASE}/projects/${id}`, {
    headers: { "x-api-key": getKey() },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Submagic getProject lỗi ${res.status}: ${t.slice(0, 200)}`);
  }
  return (await res.json()) as SubmagicProject;
}

/** Trích URL video cuối cùng từ webhook payload (cấu trúc Submagic có thể khác nhau). */
export function extractFinalUrl(payload: SubmagicProject): string | null {
  return (
    payload.downloadUrl ?? payload.outputUrl ?? (typeof payload.videoUrl === "string" ? payload.videoUrl : null) ?? null
  );
}
