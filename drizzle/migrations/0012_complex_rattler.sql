CREATE SCHEMA "common";
--> statement-breakpoint
CREATE TABLE "common"."idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" integer NOT NULL,
	"scope" varchar(100) NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"resource_type" varchar(50),
	"resource_id" integer,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_actor_scope_key_unique" ON "common"."idempotency_keys" USING btree ("actor_type","actor_id","scope","idempotency_key");