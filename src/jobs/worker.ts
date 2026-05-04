import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { QUEUE_NAMES, type IdeaJob } from "./queue";
import { runCrawlIdeas } from "./crawl-ideas";
import { runScoreIdea } from "./score-idea";

const ideasWorker = new Worker<IdeaJob>(
  QUEUE_NAMES.ideas,
  async (job) => {
    console.log(`[worker] ${QUEUE_NAMES.ideas} :: ${job.name}`, job.data);
    const payload = job.data;
    if (!payload || typeof payload !== "object" || !("type" in payload)) {
      throw new Error(`Bad job payload for ${job.name}`);
    }
    switch (payload.type) {
      case "crawl-ideas":
        return runCrawlIdeas(payload.data);
      case "score-idea":
        return runScoreIdea(payload.data.ideaId);
      default: {
        const _never: never = payload;
        throw new Error(`Unknown job type: ${JSON.stringify(_never)}`);
      }
    }
  },
  { connection: redis, concurrency: 2 },
);

ideasWorker.on("completed", (job) => {
  console.log(`[worker] ✓ ${job.name} (${job.id})`);
});
ideasWorker.on("failed", (job, err) => {
  console.error(`[worker] ✗ ${job?.name} (${job?.id}):`, err.message);
});

console.log(`[worker] Listening on queue: ${QUEUE_NAMES.ideas}`);

const shutdown = async () => {
  console.log("[worker] shutting down...");
  await ideasWorker.close();
  await redis.quit();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
