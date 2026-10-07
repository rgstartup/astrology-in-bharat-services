ALTER TABLE "consultations"."chat_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consultations"."chat_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "consultations"."chat_messages" CASCADE;--> statement-breakpoint
DROP TABLE "consultations"."chat_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "consultations"."reviews" DROP CONSTRAINT IF EXISTS "reviews_session_id_chat_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "consultations"."reviews" DROP CONSTRAINT IF EXISTS "FK_ecbc75cbb93e18a8835aae78204";
--> statement-breakpoint
ALTER TABLE "consultations"."reviews" ADD CONSTRAINT "reviews_session_id_consultation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."consultation_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."chat_messages_type_enum";--> statement-breakpoint
DROP TYPE "public"."chat_sessions_status_enum";