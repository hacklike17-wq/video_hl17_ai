import { env } from "../lib/env";

export type PexelsVideoFile = {
  link: string;
  quality: string; // "hd" | "sd" | ...
  width: number;
  height: number;
  file_type: string;
};

export type PexelsVideo = {
  id: number;
  url: string; // pexels page
  duration: number;
  width: number;
  height: number;
  video_files: PexelsVideoFile[];
  image: string; // thumbnail
};

/**
 * Search video stock dạng portrait (9:16) trên Pexels theo prompt.
 * Trả về mảng video — caller có thể pick element đầu tiên hoặc lọc theo duration.
 */
export async function searchPortraitVideos(opts: {
  query: string;
  perPage?: number;
  minDuration?: number;
  maxDuration?: number;
}): Promise<PexelsVideo[]> {
  if (!env.PEXELS_API_KEY) {
    throw new Error("PEXELS_API_KEY chưa được cấu hình.");
  }

  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(
    opts.query,
  )}&orientation=portrait&size=medium&per_page=${opts.perPage ?? 5}`;

  const res = await fetch(url, {
    headers: { Authorization: env.PEXELS_API_KEY },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pexels lỗi ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { videos?: PexelsVideo[] };
  let vids = data.videos ?? [];

  if (opts.minDuration != null) vids = vids.filter((v) => v.duration >= opts.minDuration!);
  if (opts.maxDuration != null) vids = vids.filter((v) => v.duration <= opts.maxDuration!);

  return vids;
}

/**
 * Pick file portrait quality cao nhất (HD ưu tiên) từ 1 video Pexels.
 * Trả về URL trực tiếp tới file MP4.
 */
export function pickBestPortraitFile(video: PexelsVideo): string | null {
  const portrait = video.video_files.filter(
    (f) => f.height >= f.width && f.file_type === "video/mp4",
  );
  if (!portrait.length) return null;
  // Sort by quality preference + height desc
  const order = { hd: 0, sd: 1, mobile: 2 } as Record<string, number>;
  portrait.sort((a, b) => {
    const oa = order[a.quality.toLowerCase()] ?? 9;
    const ob = order[b.quality.toLowerCase()] ?? 9;
    if (oa !== ob) return oa - ob;
    return b.height - a.height;
  });
  return portrait[0]?.link ?? null;
}
