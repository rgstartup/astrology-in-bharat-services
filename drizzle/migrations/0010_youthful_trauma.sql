DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'consultations' AND table_name = 'chat_messages') THEN
    ALTER TABLE "consultations"."chat_messages" DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'consultations' AND table_name = 'chat_sessions') THEN
    ALTER TABLE "consultations"."chat_sessions" DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "consultations"."chat_messages" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "consultations"."chat_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "consultations"."reviews" DROP CONSTRAINT IF EXISTS "reviews_session_id_chat_sessions_id_fk";--> statement-breakpoint
ALTER TABLE "consultations"."reviews" DROP CONSTRAINT IF EXISTS "FK_ecbc75cbb93e18a8835aae78204";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consultations"."reviews" ADD CONSTRAINT "reviews_session_id_consultation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."consultation_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."chat_messages_type_enum";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."chat_sessions_status_enum";