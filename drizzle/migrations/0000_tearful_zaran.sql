CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE SCHEMA "client";
--> statement-breakpoint
CREATE TYPE "public"."admin_permission" AS ENUM('dashboard', 'user_management', 'expert_management', 'agent_management', 'mandir_management', 'shop_management', 'order_management', 'payout_requests', 'refund_management', 'live_sessions', 'reviews_moderation', 'coupons_offers', 'products', 'analytics_dashboard', 'settings', 'kyc_review');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('client', 'expert', 'merchant', 'agent', 'admin');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('client', 'expert', 'merchant', 'agent', 'admin', 'super_admin', 'sub_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('PENDING_REGISTRATION', 'ACTIVE', 'BLOCKED', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_group_id" uuid,
	"email" varchar(255) NOT NULL,
	"password" text,
	"email_verified_at" timestamp with time zone,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"name" varchar(255),
	"full_name" varchar(255),
	"avatar" text,
	"avatar_id" integer,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"blocked_by_id" integer,
	"blocked_by_name" varchar(255),
	"blocked_at" timestamp with time zone,
	"role" "role" DEFAULT 'client' NOT NULL,
	"platform" "platform" DEFAULT 'client' NOT NULL,
	"admin_permissions" "admin_permission"[],
	"referred_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "USER_PLATFORM_UNIQ" UNIQUE("email","platform")
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"email" text,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."otp" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"email" varchar(255) NOT NULL,
	"otp" varchar(255) NOT NULL,
	"purpose" varchar(50) DEFAULT 'registration' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"secret_hash" text NOT NULL,
	"type" text DEFAULT 'refresh_token' NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"ip_address" varchar(100),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."used_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"purpose" varchar(50),
	"used_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "used_tokens_user_id_token_unique" UNIQUE("user_id","token")
);
--> statement-breakpoint
CREATE TABLE "client"."account" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"public_id" varchar(12) NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"avatar" text,
	"avatar_id" integer,
	"username" text,
	"date_of_birth" timestamp with time zone,
	"gender" text DEFAULT 'other' NOT NULL,
	"phone" text,
	"phone_verified_at" timestamp with time zone,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"language_preference" text,
	"time_of_birth" text,
	"place_of_birth" text,
	"marital_status" text,
	"occupation" text,
	"about_me" text,
	"total_spending" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "account_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "auth"."oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."otp" ADD CONSTRAINT "otp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."used_tokens" ADD CONSTRAINT "used_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client"."account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "otp_email_idx" ON "auth"."otp" USING btree ("email");