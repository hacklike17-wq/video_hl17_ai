import IORedis from "ioredis";
import { env } from "./env";

const globalRedis = globalThis as unknown as { __redis?: IORedis };

export const redis =
  globalRedis.__redis ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

if (env.NODE_ENV !== "production") globalRedis.__redis = redis;
