CREATE TABLE "expert"."expert_payout_account_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"payout_account_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments"."providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "providers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "expert"."expert_payout_account_links" ADD CONSTRAINT "expert_payout_account_links_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_payout_account_links" ADD CONSTRAINT "expert_payout_account_links_payout_account_id_payout_accounts_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "payments"."payout_accounts"("id") ON DELETE cascade ON UPDATE no action;