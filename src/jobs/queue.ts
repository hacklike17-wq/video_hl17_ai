import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const QUEUE_NAMES = {
  ideas: "ideas",
} as const;

const globalQueues = globalThis as unknown as {
  __ideasQueue?: Queue;
};

export const ideasQueue =
  globalQueues.__ideasQueue ??
  new Queue(QUEUE_NAMES.ideas, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 24 * 3600 },
    },
  });

if (process.env.NODE_ENV !== "production") globalQueues.__ideasQueue = ideasQueue;

export type CrawlIdeasJob = {
  type: "crawl-ideas";
  data: { brandId?: string; limit?: number };
};

export type ScoreIdeaJob = {
  type: "score-idea";
  data: { ideaId: string };
};

export type GenerateScriptJob = {
  type: "generate-script";
  data: { ideaId: string };
};

export type IdeaJob = CrawlIdeasJob | ScoreIdeaJob | GenerateScriptJob;
