DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_recordings_status_enum')
		AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consultation_recording_status_enum') THEN
		ALTER TYPE "public"."session_recordings_status_enum" RENAME TO "consultation_recording_status_enum";
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consultations"."consultation_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_providers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consultations"."consultation_voice_records" (
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
	CONSTRAINT "consultation_voice_records_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "consultation_voice_records_session_id_consultation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."consultation_sessions"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "consultation_voice_records_provider_id_consultation_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "consultations"."consultation_providers"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "consultation_voice_records_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."media"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consultations"."consultation_video_records" (
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
	CONSTRAINT "consultation_video_records_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "consultation_video_records_session_id_consultation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."consultation_sessions"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "consultation_video_records_provider_id_consultation_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "consultations"."consultation_providers"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "consultation_video_records_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."media"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consultation_voice_records_session_id_idx" ON "consultations"."consultation_voice_records" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consultation_video_records_session_id_idx" ON "consultations"."consultation_video_records" USING btree ("session_id");--> statement-breakpoint
DROP TABLE IF EXISTS "consultations"."session_recordings" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "consultations"."session_providers" CASCADE;
