ALTER TYPE "public"."session_recordings_status_enum" RENAME TO "consultation_recording_status_enum";--> statement-breakpoint
CREATE TABLE "consultations"."consultation_video_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"provider_id" integer,
	"media_id" integer,
	"provider_recording_id" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"status" "consultation_recording_status_enum" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_video_records_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "consultations"."consultation_voice_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"provider_id" integer,
	"media_id" integer,
	"provider_recording_id" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"status" "consultation_recording_status_enum" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_voice_records_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "consultations"."session_recordings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "consultations"."session_recordings" CASCADE;--> statement-breakpoint
ALTER TABLE "consultations"."session_providers" RENAME TO "consultation_providers";--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" DROP CONSTRAINT "session_providers_session_id_consultation_sessions_id_fk";
--> statement-breakpoint
DROP INDEX "consultations"."session_providers_session_id_idx";--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" ADD COLUMN "config" jsonb;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_video_records" ADD CONSTRAINT "consultation_video_records_session_id_consultation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."consultation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_video_records" ADD CONSTRAINT "consultation_video_records_provider_id_consultation_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "consultations"."consultation_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_video_records" ADD CONSTRAINT "consultation_video_records_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_voice_records" ADD CONSTRAINT "consultation_voice_records_session_id_consultation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."consultation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_voice_records" ADD CONSTRAINT "consultation_voice_records_provider_id_consultation_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "consultations"."consultation_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_voice_records" ADD CONSTRAINT "consultation_voice_records_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consultation_video_records_session_id_idx" ON "consultations"."consultation_video_records" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "consultation_voice_records_session_id_idx" ON "consultations"."consultation_voice_records" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" DROP COLUMN "session_id";--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" DROP COLUMN "provider";--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" DROP COLUMN "provider_session_id";--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "consultations"."consultation_providers" ADD CONSTRAINT "consultation_providers_code_unique" UNIQUE("code");