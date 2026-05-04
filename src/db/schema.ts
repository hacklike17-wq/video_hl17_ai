import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdateFn(() => new Date());

export const brandProfile = sqliteTable("brand_profile", {
  id: id(),
  name: text("name").notNull(),
  voiceIdElevenLabs: text("voice_id_elevenlabs"),
  voiceIdArgil: text("voice_id_argil"),
  avatarIdArgil: text("avatar_id_argil"),
  voiceStyle: text("voice_style"),
  signaturePhrases: text("signature_phrases"),
  contentPillars: text("content_pillars"),
  bannedTopics: text("banned_topics"),
  primaryColor: text("primary_color").default("#FF6B35"),
  submagicTemplateId: text("submagic_template_id"),
  hookExamples: text("hook_examples"),
  scriptExamples: text("script_examples"),
  defaultCta: text("default_cta"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const ideas = sqliteTable("ideas", {
  id: id(),
  brandId: text("brand_id").references(() => brandProfile.id),
  title: text("title").notNull(),
  hookText: text("hook_text"),
  sourceUrl: text("source_url"),
  sourcePlatform: text("source_platform", {
    enum: ["tiktok", "youtube", "instagram", "twitter", "manual"],
  }).default("manual"),
  viewCount: integer("view_count"),
  postedDate: integer("posted_date", { mode: "timestamp" }),
  crawledDate: integer("crawled_date", { mode: "timestamp" }).default(sql`(unixepoch())`),
  pillar: text("pillar"),
  score: real("score"),
  angle: text("angle"),
  status: text("status", {
    enum: ["idea", "approved", "script_gen", "done", "rejected"],
  })
    .notNull()
    .default("idea"),
  rawData: text("raw_data", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const scripts = sqliteTable("scripts", {
  id: id(),
  ideaId: text("idea_id")
    .notNull()
    .references(() => ideas.id, { onDelete: "cascade" }),
  brandId: text("brand_id").references(() => brandProfile.id),
  version: integer("version").notNull().default(1),
  hook: text("hook"),
  setup: text("setup"),
  body: text("body"),
  payoff: text("payoff"),
  cta: text("cta"),
  brollPrompts: text("broll_prompts", { mode: "json" }).$type<string[]>(),
  status: text("status", {
    enum: ["draft", "pending_review", "approved", "rendering", "done", "rejected"],
  })
    .notNull()
    .default("draft"),
  rejectReason: text("reject_reason"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const videos = sqliteTable("videos", {
  id: id(),
  scriptId: text("script_id")
    .notNull()
    .references(() => scripts.id, { onDelete: "cascade" }),
  argilJobId: text("argil_job_id"),
  submagicProjectId: text("submagic_project_id"),
  voiceUrl: text("voice_url"),
  avatarUrl: text("avatar_url"),
  brollUrls: text("broll_urls", { mode: "json" }).$type<string[]>(),
  finalUrl: text("final_url"),
  thumbnailUrl: text("thumbnail_url"),
  duration: real("duration"),
  caption: text("caption"),
  status: text("status", {
    enum: [
      "generating_assets",
      "assembling",
      "rendering",
      "pending_review",
      "approved",
      "scheduled",
      "published",
      "rejected",
      "argil_failed",
      "submagic_failed",
    ],
  })
    .notNull()
    .default("generating_assets"),
  rejectReason: text("reject_reason"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  platforms: text("platforms", { mode: "json" }).$type<string[]>(),
  bufferIds: text("buffer_ids", { mode: "json" }).$type<Record<string, string>>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const jobsLog = sqliteTable("jobs_log", {
  id: id(),
  jobType: text("job_type").notNull(),
  status: text("status", { enum: ["queued", "running", "success", "failed"] }).notNull(),
  refTable: text("ref_table"),
  refId: text("ref_id"),
  payload: text("payload", { mode: "json" }),
  error: text("error"),
  durationMs: integer("duration_ms"),
  createdAt: createdAt(),
});

export type BrandProfile = typeof brandProfile.$inferSelect;
export type NewBrandProfile = typeof brandProfile.$inferInsert;
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type Script = typeof scripts.$inferSelect;
export type NewScript = typeof scripts.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
