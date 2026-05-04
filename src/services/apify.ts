import { env } from "../lib/env";

const BASE = "https://api.apify.com/v2";

function getToken(): string {
  if (!env.APIFY_TOKEN) {
    throw new Error("APIFY_TOKEN chưa cấu hình. Thêm vào .env và restart.");
  }
  return env.APIFY_TOKEN;
}

export type ApifyTikTokItem = {
  id?: string;
  webVideoUrl?: string;
  text?: string;
  playCount?: number;
  diggCount?: number;
  shareCount?: number;
  commentCount?: number;
  createTime?: number;
  authorMeta?: { name?: string; nickName?: string };
  hashtags?: { name: string }[];
  videoMeta?: { duration?: number; coverUrl?: string };
  [k: string]: unknown;
};

/**
 * Run the Apify TikTok scraper synchronously (waits for completion) and return
 * the dataset items. Use small `resultsPerPage` to keep run time short.
 */
export async function runTikTokScraper(opts: {
  hashtags?: string[];
  searchTerms?: string[];
  resultsPerPage?: number;
  maxItems?: number;
}): Promise<ApifyTikTokItem[]> {
  const token = getToken();
  const actor = env.APIFY_TIKTOK_ACTOR.replace("/", "~");

  const input: Record<string, unknown> = {
    resultsPerPage: opts.resultsPerPage ?? 10,
    maxItems: opts.maxItems ?? 20,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    proxyCountryCode: "None",
  };

  if (opts.hashtags?.length) input.hashtags = opts.hashtags;
  if (opts.searchTerms?.length) input.searchQueries = opts.searchTerms;

  const url = `${BASE}/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=120`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify run failed: ${res.status} ${body.slice(0, 300)}`);
  }

  const items = (await res.json()) as ApifyTikTokItem[];
  return Array.isArray(items) ? items : [];
}

/** Convert raw Apify item into the shape we save into the `ideas` table. */
export function tiktokItemToIdea(item: ApifyTikTokItem) {
  const title = (item.text ?? "").slice(0, 140) || "(no caption)";
  return {
    title,
    hookText: item.text ?? null,
    sourceUrl: item.webVideoUrl ?? null,
    sourcePlatform: "tiktok" as const,
    viewCount: item.playCount ?? null,
    postedDate: item.createTime ? new Date(item.createTime * 1000) : null,
    rawData: item as unknown as Record<string, unknown>,
  };
}
