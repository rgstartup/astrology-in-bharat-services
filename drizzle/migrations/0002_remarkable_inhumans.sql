CREATE SCHEMA "commerce";
--> statement-breakpoint
CREATE TYPE "commerce"."products_product_group_enum" AS ENUM('book', 'report', 'item', 'ritual', 'session');--> statement-breakpoint
CREATE TYPE "commerce"."products_type_enum" AS ENUM('GOODS', 'SERVICE', 'DIGITAL');--> statement-breakpoint
CREATE TABLE "commerce"."cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"cart_id" integer,
	"product_id" integer,
	"variant_id" bigint,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."carts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "commerce"."product_variants" (
	"id" bigint PRIMARY KEY NOT NULL,
	"product_id" bigint NOT NULL,
	"name" varchar(150) NOT NULL,
	"sku" varchar(100),
	"attributes" jsonb,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"type" "products_type_enum" DEFAULT 'GOODS' NOT NULL,
	"product_group" "products_product_group_enum" DEFAULT 'item' NOT NULL,
	"merchant_id" integer,
	"stock" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"original_price" numeric(10, 2) NOT NULL,
	"is_shipping_chargeable" boolean DEFAULT false NOT NULL,
	"shipping_charge" numeric(10, 2) NOT NULL,
	"sku" varchar(255),
	"image_url" varchar(255),
	"gallery" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"short_description" varchar(500),
	"percentage_off" numeric(5, 2) NOT NULL,
	"category" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commerce"."cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "commerce"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "commerce"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."carts" ADD CONSTRAINT "carts_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;