CREATE SCHEMA "content";
--> statement-breakpoint
CREATE TYPE "content"."media_source_enum" AS ENUM('cloudinary', 'google', 'local', 'external');--> statement-breakpoint
CREATE TYPE "public"."addresses_tag_enum" AS ENUM('home', 'office', 'billing', 'shipping', 'other');--> statement-breakpoint
CREATE TYPE "public"."addresses_type_enum" AS ENUM('shipping', 'billing');--> statement-breakpoint
CREATE TABLE "content"."media" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" varchar NOT NULL,
	"source" "media_source_enum" DEFAULT 'cloudinary' NOT NULL,
	"public_id" varchar(255),
	"mime_type" varchar(100),
	"alt_text" varchar(500),
	"file_size" integer,
	"file_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "addresses_type_enum" DEFAULT 'shipping' NOT NULL,
	"street" varchar(255) NOT NULL,
	"house_no" varchar(100),
	"city" varchar(100),
	"district" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"zip_code" varchar(10),
	"pincode" varchar(10),
	"is_primary" boolean DEFAULT false NOT NULL,
	"tag" "addresses_tag_enum" DEFAULT 'home' NOT NULL,
	"profile_expert_id" integer,
	"client_account_id" integer,
	CONSTRAINT "addresses_profile_expert_tag_unique" UNIQUE("profile_expert_id","tag"),
	CONSTRAINT "addresses_client_account_tag_unique" UNIQUE("client_account_id","tag")
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_client_account_id_account_id_fk" FOREIGN KEY ("client_account_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;