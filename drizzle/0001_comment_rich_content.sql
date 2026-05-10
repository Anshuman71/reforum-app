ALTER TABLE "comments" ADD COLUMN "content_json" jsonb;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "content_html" text;
