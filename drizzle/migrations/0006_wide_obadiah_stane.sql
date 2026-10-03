CREATE TYPE "public"."consultation_billings_status_enum" AS ENUM('draft', 'finalized', 'voided');--> statement-breakpoint
CREATE TYPE "public"."consultation_messages_type_enum" AS ENUM('text', 'image', 'file');--> statement-breakpoint
CREATE TYPE "public"."consultation_sessions_mode_enum" AS ENUM('CHAT', 'AUDIO_CALL', 'VIDEO_CALL');--> statement-breakpoint
CREATE TYPE "public"."consultation_sessions_status_enum" AS ENUM('pending', 'active', 'completed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."consultations_mode_enum" AS ENUM('CHAT', 'AUDIO_CALL', 'VIDEO_CALL');--> statement-breakpoint
CREATE TYPE "public"."consultations_status_enum" AS ENUM('requested', 'accepted', 'active', 'completed', 'cancelled', 'rejected', 'missed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."session_recordings_status_enum" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "consultations"."consultation_billings" (
	"id" serial PRIMARY KEY NOT NULL,
	"consultation_id" integer NOT NULL,
	"status" "consultation_billings_status_enum" DEFAULT 'draft' NOT NULL,
	"rate_per_minute" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"billable_seconds" integer DEFAULT 0 NOT NULL,
	"billable_minutes" numeric(10, 2) DEFAULT '0' NOT NULL,
	"gross_earning" numeric(12, 2) DEFAULT '0' NOT NULL,
	"platform_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deduction_breakdown" jsonb,
	"net_payable" numeric(12, 2) DEFAULT '0' NOT NULL,
	"earning_split_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_billings_consultation_id_unique" UNIQUE("consultation_id")
);
--> statement-breakpoint
CREATE TABLE "consultations"."consultation_message_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"media_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations"."consultation_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"consultation_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_type" text NOT NULL,
	"message_type" "consultation_messages_type_enum" DEFAULT 'text' NOT NULL,
	"content" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations"."consultation_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"consultation_id" integer NOT NULL,
	"mode" "consultation_sessions_mode_enum" NOT NULL,
	"status" "consultation_sessions_status_enum" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations"."consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"expert_id" integer NOT NULL,
	"mode" "consultations_mode_enum" NOT NULL,
	"status" "consultations_status_enum" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations"."session_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_session_id" text,
	"status" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations"."session_recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"media_id" integer,
	"provider_recording_id" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"status" "session_recordings_status_enum" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content"."media" ADD COLUMN "storage_key" varchar(512);--> statement-breakpoint
ALTER TABLE "content"."media" ADD COLUMN "checksum" varchar(128);--> statement-breakpoint
ALTER TABLE "content"."media" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings" ADD CONSTRAINT "consultation_billings_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "consultations"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_billings" ADD CONSTRAINT "consultation_billings_earning_split_id_earning_splits_id_fk" FOREIGN KEY ("earning_split_id") REFERENCES "finance"."earning_splits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_message_attachments" ADD CONSTRAINT "consultation_message_attachments_message_id_consultation_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "consultations"."consultation_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_message_attachments" ADD CONSTRAINT "consultation_message_attachments_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_messages" ADD CONSTRAINT "consultation_messages_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "consultations"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_sessions" ADD CONSTRAINT "consultation_sessions_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "consultations"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."consultations" ADD CONSTRAINT "consultations_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."session_providers" ADD CONSTRAINT "session_providers_session_id_consultation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."consultation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."session_recordings" ADD CONSTRAINT "session_recordings_session_id_consultation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."consultation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."session_recordings" ADD CONSTRAINT "session_recordings_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consultation_message_attachments_message_id_idx" ON "consultations"."consultation_message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "consultation_messages_consultation_id_idx" ON "consultations"."consultation_messages" USING btree ("consultation_id");--> statement-breakpoint
CREATE INDEX "consultation_sessions_consultation_id_idx" ON "consultations"."consultation_sessions" USING btree ("consultation_id");--> statement-breakpoint
CREATE INDEX "consultations_client_id_idx" ON "consultations"."consultations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "consultations_expert_id_idx" ON "consultations"."consultations" USING btree ("expert_id");--> statement-breakpoint
CREATE INDEX "session_providers_session_id_idx" ON "consultations"."session_providers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_recordings_session_id_idx" ON "consultations"."session_recordings" USING btree ("session_id");