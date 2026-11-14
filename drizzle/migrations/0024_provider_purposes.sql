CREATE TABLE "payments"."provider_purposes" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"purpose" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_purposes_purpose_unique" UNIQUE("purpose"),
	CONSTRAINT "provider_purposes_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "payments"."providers"("id") ON DELETE cascade
);--> statement-breakpoint
