ALTER TABLE "content"."media" ALTER COLUMN "source" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "content"."media" ALTER COLUMN "source" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations"."consultation_messages" ADD COLUMN IF NOT EXISTS "session_id" integer;--> statement-breakpoint
ALTER TABLE "content"."media" ADD COLUMN IF NOT EXISTS "storage_provider" varchar(100);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consultations"."consultation_messages" ADD CONSTRAINT "consultation_messages_session_id_consultation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."consultation_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consultation_messages_session_id_idx" ON "consultations"."consultation_messages" USING btree ("session_id");
