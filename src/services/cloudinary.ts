import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { env } from "../lib/env";

/**
 * Upload audio buffer lên Cloudinary qua signed REST API.
 * Cloudinary lưu MP3 dưới resource_type "video" (theo doc của họ).
 */
export async function uploadAudio(opts: {
  buffer: Buffer;
  filename: string;
  folder?: string;
}): Promise<{ url: string; publicId: string; bytes: number }> {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials chưa cấu hình đầy đủ trong .env.");
  }

  const ts = Math.round(Date.now() / 1000);
  const folder = opts.folder ?? "video_ai/audio";

  // Build params + signature (alphabetical order)
  const params: Record<string, string> = {
    folder,
    timestamp: String(ts),
  };
  const stringToSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(stringToSign + env.CLOUDINARY_API_SECRET)
    .digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(opts.buffer)], { type: "audio/mpeg" }), opts.filename);
  form.append("api_key", env.CLOUDINARY_API_KEY);
  form.append("timestamp", String(ts));
  form.append("folder", folder);
  form.append("signature", signature);

  const url = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/video/upload`;
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudinary upload thất bại ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { secure_url: string; public_id: string; bytes: number };
  return { url: data.secure_url, publicId: data.public_id, bytes: data.bytes };
}

/**
 * Upload video MP4 từ local path lên Cloudinary (signed). Lưu vào folder video_ai/merged.
 */
export async function uploadVideoFile(opts: {
  filePath: string;
  filename: string;
  folder?: string;
}): Promise<{ url: string; publicId: string; bytes: number }> {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials chưa cấu hình đầy đủ.");
  }
  const buf = await readFile(opts.filePath);
  const ts = Math.round(Date.now() / 1000);
  const folder = opts.folder ?? "video_ai/merged";
  const stringToSign = `folder=${folder}&timestamp=${ts}`;
  const signature = crypto
    .createHash("sha1")
    .update(stringToSign + env.CLOUDINARY_API_SECRET)
    .digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: "video/mp4" }), opts.filename);
  form.append("api_key", env.CLOUDINARY_API_KEY);
  form.append("timestamp", String(ts));
  form.append("folder", folder);
  form.append("signature", signature);

  const url = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/video/upload`;
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudinary video upload thất bại ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { secure_url: string; public_id: string; bytes: number };
  return { url: data.secure_url, publicId: data.public_id, bytes: data.bytes };
}
