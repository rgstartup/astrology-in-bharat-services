ALTER TABLE "expert"."account" ADD COLUMN IF NOT EXISTS "availability_mode" varchar(20) DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "expert"."account" ADD COLUMN IF NOT EXISTS "avatar_id" integer;--> statement-breakpoint
ALTER TABLE "expert"."account" ADD COLUMN IF NOT EXISTS "intro_video" text;--> statement-breakpoint
ALTER TABLE "expert"."account" ADD COLUMN IF NOT EXISTS "intro_video_id" integer;--> statement-breakpoint
UPDATE "expert"."account" SET "availability_mode" = CASE WHEN "is_available" = true THEN 'available' ELSE 'unavailable' END WHERE "availability_mode" = 'available' AND "is_available" = false;
