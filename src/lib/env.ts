import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be set (>=16 chars)"),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD_HASH: z.string().min(10, "ADMIN_PASSWORD_HASH required"),

  DATABASE_URL: z.string().default("file:./data/app.db"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  CRON_SECRET: z.string().optional(),
  ARGIL_WEBHOOK_SECRET: z.string().optional(),
  SUBMAGIC_WEBHOOK_SECRET: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-6"),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_MODEL: z.string().default("eleven_multilingual_v2"),
  ARGIL_API_KEY: z.string().optional(),
  APIFY_TOKEN: z.string().optional(),
  APIFY_TIKTOK_ACTOR: z.string().default("clockworks/tiktok-scraper"),
  PEXELS_API_KEY: z.string().optional(),
  SUBMAGIC_API_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
  BUFFER_ACCESS_TOKEN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment");
}

export const env = parsed.data;
