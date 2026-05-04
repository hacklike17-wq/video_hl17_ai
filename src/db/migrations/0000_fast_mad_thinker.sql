CREATE TABLE `brand_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`voice_id_elevenlabs` text,
	`voice_id_argil` text,
	`avatar_id_argil` text,
	`voice_style` text,
	`signature_phrases` text,
	`content_pillars` text,
	`banned_topics` text,
	`primary_color` text DEFAULT '#FF6B35',
	`submagic_template_id` text,
	`hook_examples` text,
	`script_examples` text,
	`default_cta` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text,
	`title` text NOT NULL,
	`hook_text` text,
	`source_url` text,
	`source_platform` text DEFAULT 'manual',
	`view_count` integer,
	`posted_date` integer,
	`crawled_date` integer DEFAULT (unixepoch()),
	`pillar` text,
	`score` real,
	`angle` text,
	`status` text DEFAULT 'idea' NOT NULL,
	`raw_data` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brand_profile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `jobs_log` (
	`id` text PRIMARY KEY NOT NULL,
	`job_type` text NOT NULL,
	`status` text NOT NULL,
	`ref_table` text,
	`ref_id` text,
	`payload` text,
	`error` text,
	`duration_ms` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`idea_id` text NOT NULL,
	`brand_id` text,
	`version` integer DEFAULT 1 NOT NULL,
	`hook` text,
	`setup` text,
	`body` text,
	`payoff` text,
	`cta` text,
	`broll_prompts` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`reject_reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`brand_id`) REFERENCES `brand_profile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`script_id` text NOT NULL,
	`argil_job_id` text,
	`submagic_project_id` text,
	`voice_url` text,
	`avatar_url` text,
	`broll_urls` text,
	`final_url` text,
	`thumbnail_url` text,
	`duration` real,
	`caption` text,
	`status` text DEFAULT 'generating_assets' NOT NULL,
	`reject_reason` text,
	`scheduled_at` integer,
	`published_at` integer,
	`platforms` text,
	`buffer_ids` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`script_id`) REFERENCES `scripts`(`id`) ON UPDATE no action ON DELETE cascade
);
