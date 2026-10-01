CREATE TYPE "public"."call_sessions_status_enum" AS ENUM('pending', 'active', 'completed', 'cancelled', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."chat_sessions_status_enum" AS ENUM('pending', 'active', 'completed', 'cancelled', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."wallet_recharges_status_enum" AS ENUM('pending', 'success', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."wallet_transactions_purpose_enum" AS ENUM('recharge', 'consultation', 'refund', 'product_purchase', 'booking_confirmation', 'puja_confirmation');--> statement-breakpoint
CREATE TYPE "public"."wallet_transactions_type_enum" AS ENUM('credit', 'debit', 'hold', 'release');--> statement-breakpoint
CREATE TYPE "public"."finance_commission_applies_role_enum" AS ENUM('all', 'expert', 'merchant', 'client', 'agent');--> statement-breakpoint
CREATE TYPE "public"."finance_commission_event_type_enum" AS ENUM('chat', 'call', 'puja', 'product_order');--> statement-breakpoint
CREATE TYPE "public"."finance_commission_rate_type_enum" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."finance_commission_type_enum" AS ENUM('platform_fee', 'seller_agent', 'buyer_agent', 'gst');--> statement-breakpoint
CREATE TYPE "public"."coupons_status_enum" AS ENUM('active', 'inactive', 'expired');--> statement-breakpoint
CREATE TYPE "public"."coupons_type_enum" AS ENUM('percentage', 'flat');--> statement-breakpoint
CREATE TYPE "public"."product_variant_fulfillment_delivery_type_enum" AS ENUM('shipping', 'download', 'email', 'instant', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."finance_earning_applies_role_enum" AS ENUM('all', 'expert', 'merchant', 'client', 'agent');--> statement-breakpoint
CREATE TYPE "public"."finance_earning_event_type_enum" AS ENUM('chat', 'call', 'puja', 'product_order');--> statement-breakpoint
CREATE TYPE "public"."finance_earning_rate_type_enum" AS ENUM('fixed', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."account_kyc_status_enum" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."expert_consultation_pricing_status_enum" AS ENUM('active', 'expired', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."expert_consultation_pricing_target_audience_enum" AS ENUM('all', 'first_time', 'repeat', 'specific_client');--> statement-breakpoint
CREATE TYPE "public"."expert_products_relation_type_enum" AS ENUM('provider', 'promoter');--> statement-breakpoint
CREATE TYPE "public"."favorites_item_type_enum" AS ENUM('expert', 'product', 'product_variant', 'product_category', 'temple');--> statement-breakpoint
CREATE TYPE "public"."finance_transactions_purpose_enum" AS ENUM('recharge', 'consultation', 'refund', 'withdrawal', 'product_purchase', 'puja_confirmation', 'agent_commission');--> statement-breakpoint
CREATE TYPE "public"."finance_transactions_type_enum" AS ENUM('credit', 'debit', 'hold', 'release');--> statement-breakpoint
CREATE TYPE "public"."product_variant_fulfillment_fulfillment_type_enum" AS ENUM('physical', 'digital', 'service');--> statement-breakpoint
CREATE TYPE "public"."finance_gateway_intent_enum" AS ENUM('wallet_recharge', 'product_purchase', 'booking');--> statement-breakpoint
CREATE TYPE "public"."finance_gateway_name_enum" AS ENUM('razorpay', 'phonepe', 'cashfree');--> statement-breakpoint
CREATE TYPE "public"."finance_gateway_transaction_status_enum" AS ENUM('pending', 'success', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."finance_general_ledger_entry_type_enum" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."finance_general_ledger_event_type_enum" AS ENUM('recharge', 'consultation', 'puja', 'booking', 'product_order', 'withdrawal', 'refund', 'agent_commission', 'platform_fee');--> statement-breakpoint
CREATE TYPE "public"."finance_general_ledger_party_type_enum" AS ENUM('client', 'expert', 'merchant', 'agent', 'platform');--> statement-breakpoint
CREATE TYPE "public"."account_status_enum" AS ENUM('pending_verification', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."notifications_type_enum" AS ENUM('order_created', 'order_placed', 'order_packed', 'order_shipped', 'order_delivered', 'order_cancelled', 'wallet_recharge', 'puja_booking', 'general');--> statement-breakpoint
CREATE TYPE "public"."order_addresses_address_type_enum" AS ENUM('primary', 'billing', 'shipping', 'other');--> statement-breakpoint
CREATE TYPE "public"."order_items_status_enum" AS ENUM('pending', 'paid', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned');--> statement-breakpoint
CREATE TYPE "public"."product_orders_payment_status_enum" AS ENUM('pending', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."product_orders_status_enum" AS ENUM('pending', 'paid', 'processing', 'partially_shipped', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."finance_payment_orders_status_enum" AS ENUM('pending', 'authorized', 'paid', 'success', 'partially_refunded', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_payments_status_enum" AS ENUM('pending', 'success', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."products_product_group_enum" AS ENUM('book', 'report', 'item', 'ritual', 'session');--> statement-breakpoint
CREATE TYPE "public"."products_type_enum" AS ENUM('GOODS', 'SERVICE', 'DIGITAL');--> statement-breakpoint
CREATE TYPE "public"."product_variant_promotions_target_audience_enum" AS ENUM('all', 'first_time', 'repeat', 'specific_client');--> statement-breakpoint
CREATE TYPE "public"."product_variant_promotions_discount_type_enum" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."order_refunds_destination_enum" AS ENUM('wallet', 'source');--> statement-breakpoint
CREATE TYPE "public"."order_refunds_status_enum" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_shipments_status_enum" AS ENUM('pending', 'processing', 'ready_for_pickup', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'return_requested', 'returned');--> statement-breakpoint
CREATE TYPE "public"."finance_commission_splits_reference_type_enum" AS ENUM('chat', 'call', 'puja', 'order');--> statement-breakpoint
CREATE TYPE "public"."product_variant_media_media_role_enum" AS ENUM('thumbnail', 'gallery', 'certificate', 'document', 'video', 'other');--> statement-breakpoint
CREATE TYPE "public"."product_variant_pricing_target_audience_enum" AS ENUM('all', 'first_time', 'repeat', 'specific_client');--> statement-breakpoint
CREATE TYPE "public"."product_variant_pricing_status_enum" AS ENUM('active', 'expired', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."finance_withdrawals_status_enum" AS ENUM('pending', 'approved', 'processing', 'completed', 'success', 'failed', 'rejected', 'cancelled', 'reversed');--> statement-breakpoint
ALTER TYPE "commerce"."products_product_group_enum" SET SCHEMA "public";--> statement-breakpoint
ALTER TYPE "commerce"."products_type_enum" SET SCHEMA "public";--> statement-breakpoint
ALTER TYPE "public"."products_product_group_enum" RENAME TO "call_sessions_type_enum";--> statement-breakpoint
ALTER TYPE "public"."products_type_enum" RENAME TO "chat_messages_type_enum";--> statement-breakpoint
CREATE TABLE "consultations"."call_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"expert_id" integer NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"status" "call_sessions_status_enum" DEFAULT 'pending' NOT NULL,
	"type" "call_sessions_type_enum" DEFAULT 'audio' NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"free_minutes" integer DEFAULT 0 NOT NULL,
	"price_per_minute" double precision NOT NULL,
	"total_cost" double precision DEFAULT 0 NOT NULL,
	"expert_earning" numeric(10, 2) DEFAULT '0' NOT NULL,
	"agent_id" integer,
	"agent_commission" numeric(10, 2) DEFAULT '0' NOT NULL,
	"platform_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"gst" numeric(10, 2) DEFAULT '0' NOT NULL,
	"twilio_sid" text,
	"twilio_room_id" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"final_price" double precision DEFAULT 0 NOT NULL,
	"max_duration_seconds" integer DEFAULT 0 NOT NULL,
	"terminated_by" text,
	"terminated_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations"."chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_type" text NOT NULL,
	"content" text NOT NULL,
	"type" "chat_messages_type_enum" DEFAULT 'text' NOT NULL,
	"attachment_url" text,
	"attachment_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations"."chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"expert_id" integer NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"status" "chat_sessions_status_enum" DEFAULT 'pending' NOT NULL,
	"terminated_by" text,
	"terminated_reason" text,
	"session_type" text DEFAULT 'chat' NOT NULL,
	"is_recording" boolean DEFAULT false NOT NULL,
	"connection_quality" text DEFAULT 'excellent' NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"free_minutes" integer DEFAULT 0 NOT NULL,
	"price_per_minute" double precision DEFAULT 0 NOT NULL,
	"total_cost" double precision DEFAULT 0 NOT NULL,
	"expert_earning" numeric(10, 2) DEFAULT '0' NOT NULL,
	"agent_id" integer,
	"agent_commission" numeric(10, 2) DEFAULT '0' NOT NULL,
	"platform_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"gst" numeric(10, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb,
	"max_duration_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client"."favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"item_type" "favorites_item_type_enum" NOT NULL,
	"item_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client"."wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance_before" numeric(10, 2),
	"balance_after" numeric(10, 2),
	"type" "wallet_transactions_type_enum" NOT NULL,
	"purpose" "wallet_transactions_purpose_enum" NOT NULL,
	"reference_id" text,
	"reference_type" text,
	"transaction_no" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client"."wallet_recharges" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"bonus_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"gst_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_payable" numeric(10, 2) NOT NULL,
	"status" "wallet_recharges_status_enum" DEFAULT 'pending' NOT NULL,
	"payment_gateway" varchar(50) DEFAULT 'razorpay' NOT NULL,
	"gateway_order_id" text,
	"gateway_payment_id" text,
	"gateway_signature" text,
	"failure_reason" text,
	"wallet_transaction_id" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client"."wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"reserved_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "finance"."commission_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"event_type" "finance_commission_event_type_enum" NOT NULL,
	"commission_type" "finance_commission_type_enum" NOT NULL,
	"rate" numeric(6, 4) NOT NULL,
	"rate_type" "finance_commission_rate_type_enum" DEFAULT 'percentage' NOT NULL,
	"min_cap" numeric(10, 2),
	"max_cap" numeric(10, 2),
	"applies_to_role" "finance_commission_applies_role_enum" DEFAULT 'all' NOT NULL,
	"applies_to_id" integer,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."commission_splits" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference_id" text NOT NULL,
	"reference_type" "finance_commission_splits_reference_type_enum" NOT NULL,
	"gross_amount" numeric(10, 2) NOT NULL,
	"gst" numeric(10, 2) DEFAULT '0' NOT NULL,
	"seller_agent_commission" numeric(10, 2) DEFAULT '0' NOT NULL,
	"buyer_agent_commission" numeric(10, 2) DEFAULT '0' NOT NULL,
	"referral_commission" numeric(10, 2) DEFAULT '0' NOT NULL,
	"provider_net" numeric(10, 2) NOT NULL,
	"client_profile_id" integer,
	"provider_profile_id" integer,
	"seller_agent_profile_id" integer,
	"buyer_agent_profile_id" integer,
	"beneficiary_user_id" integer,
	"commission_rule_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."commission_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"from_amount" numeric(10, 2) NOT NULL,
	"to_amount" numeric(10, 2),
	"rate" numeric(6, 4) NOT NULL,
	"min_cap" numeric(10, 2),
	"max_cap" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "consultations"."consultation_topic" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"type" "coupons_type_enum" DEFAULT 'percentage' NOT NULL,
	"value" double precision NOT NULL,
	"min_order_value" double precision DEFAULT 0 NOT NULL,
	"max_discount" double precision DEFAULT 0 NOT NULL,
	"expiry_date" timestamp with time zone,
	"max_usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"status" "coupons_status_enum" DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "finance"."earning_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"event_type" "finance_earning_event_type_enum" DEFAULT 'call' NOT NULL,
	"platform_cut_type" "finance_earning_rate_type_enum" DEFAULT 'fixed' NOT NULL,
	"platform_cut_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"buyer_platform_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"gst_rate_percent" numeric(5, 2) DEFAULT '18.00' NOT NULL,
	"seller_agent_rate" numeric(6, 4) DEFAULT '0' NOT NULL,
	"buyer_agent_rate" numeric(6, 4) DEFAULT '0' NOT NULL,
	"applies_to_role" "finance_earning_applies_role_enum" DEFAULT 'all' NOT NULL,
	"applies_to_user_id" integer,
	"min_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"max_cap" numeric(10, 2),
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."earning_splits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"reference_id" varchar(100) NOT NULL,
	"reference_type" "finance_earning_event_type_enum" DEFAULT 'call' NOT NULL,
	"gross_amount" numeric(12, 2) NOT NULL,
	"platform_earning" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gst_on_platform_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"provider_earning" numeric(12, 2) NOT NULL,
	"seller_agent_earning" numeric(12, 2) DEFAULT '0' NOT NULL,
	"buyer_agent_earning" numeric(12, 2) DEFAULT '0' NOT NULL,
	"client_profile_id" integer,
	"provider_profile_id" integer,
	"seller_agent_profile_id" integer,
	"buyer_agent_profile_id" integer,
	"policy_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."earning_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_id" integer NOT NULL,
	"min_threshold" numeric(10, 2) NOT NULL,
	"max_threshold" numeric(10, 2),
	"platform_rate" numeric(10, 2) NOT NULL,
	"agent_rate" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert"."account" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"uid" text,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"avatar" text,
	"phone" text,
	"gender" text DEFAULT 'other' NOT NULL,
	"date_of_birth" timestamp with time zone,
	"specialization" text,
	"bio" text,
	"about" text,
	"languages" text,
	"experience_in_years" integer DEFAULT 0 NOT NULL,
	"total_likes" integer DEFAULT 0 NOT NULL,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"rating" double precision DEFAULT 0 NOT NULL,
	"kyc_status" "account_kyc_status_enum" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"consultation_count" integer DEFAULT 0 NOT NULL,
	"phone_number" text,
	"price" double precision,
	"chat_price" double precision,
	"call_price" double precision,
	"video_call_price" double precision,
	"report_price" double precision,
	"horoscope_price" double precision,
	"custom_services" json,
	"bank_details" text,
	"documents" json,
	"gallery" text,
	"videos" text,
	"certificates" text,
	"video" text,
	"detailed_experience" json,
	"is_available" boolean DEFAULT false NOT NULL,
	"availability_mode" varchar(20) DEFAULT 'available' NOT NULL,
	"about_me" text,
	"total_earning" numeric(10, 2) DEFAULT '0' NOT NULL,
	"razorpay_contact_id" text,
	"agent_commission_rate" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "account_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "expert"."expert_astrology_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"languages" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert"."expert_consultation_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"client_id" integer,
	"target_audience" "expert_consultation_pricing_target_audience_enum" DEFAULT 'all' NOT NULL,
	"chat_price" numeric(10, 2),
	"call_price" numeric(10, 2),
	"video_call_price" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"status" "expert_consultation_pricing_status_enum" DEFAULT 'active' NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"change_reason" text,
	"changed_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert"."expert_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"relation_type" "expert_products_relation_type_enum" DEFAULT 'provider' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert"."expert_professions" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"profession_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert"."expert_specializations" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer NOT NULL,
	"specialization_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."gateway_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"gateway_name" "finance_gateway_name_enum" DEFAULT 'razorpay' NOT NULL,
	"client_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" "finance_gateway_transaction_status_enum" DEFAULT 'pending' NOT NULL,
	"intent" "finance_gateway_intent_enum" NOT NULL,
	"gateway_order_id" text,
	"gateway_payment_id" text,
	"gateway_signature" text,
	"reference_id" text,
	"reference_type" varchar(50),
	"failure_reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gateway_transactions_gateway_order_id_unique" UNIQUE("gateway_order_id"),
	CONSTRAINT "gateway_transactions_gateway_payment_id_unique" UNIQUE("gateway_payment_id")
);
--> statement-breakpoint
CREATE TABLE "finance"."general_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text,
	"event_type" "finance_general_ledger_event_type_enum" NOT NULL,
	"entry_type" "finance_general_ledger_entry_type_enum" NOT NULL,
	"party_type" "finance_general_ledger_party_type_enum" NOT NULL,
	"party_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."idempotency_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"client_id" integer,
	"expert_id" integer,
	"merchant_id" integer,
	"agent_id" integer,
	"payload_hash" text,
	"response_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant"."account" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"uid" text,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"avatar" text,
	"shop_name" text,
	"manager_name" text,
	"phone" text,
	"address" text,
	"city" text,
	"pincode" text,
	"image" text,
	"video" text,
	"status" "account_status_enum" DEFAULT 'pending_verification' NOT NULL,
	"rating" numeric(3, 1) DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"established" text,
	"description" text,
	"is_trusted" boolean DEFAULT false NOT NULL,
	"gallery" json,
	"features" json,
	"is_online" boolean DEFAULT true NOT NULL,
	"gstin" text,
	"pan" text,
	"is_gst_exempt" boolean DEFAULT false NOT NULL,
	"bank_name" text,
	"account_holder" text,
	"account_number" text,
	"ifsc" text,
	"gst_certificate" text,
	"pan_front" text,
	"pan_back" text,
	"aadhar_front" text,
	"aadhar_back" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"operational_hours" text DEFAULT '10:00 AM - 08:30 PM',
	"trust_score" text DEFAULT '99.8',
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"agent_commission_rate" double precision,
	"bank_accounts" json,
	"razorpay_contact_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "account_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "support"."notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"expert_id" integer,
	"merchant_id" integer,
	"agent_id" integer,
	"type" "notifications_type_enum" DEFAULT 'general',
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."order_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"address_type" "order_addresses_address_type_enum" DEFAULT 'shipping' NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"alternate_phone" varchar(20),
	"address_line_1" varchar(255) NOT NULL,
	"address_line_2" varchar(255),
	"landmark" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country" varchar(100) DEFAULT 'India' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"shipment_id" integer,
	"product_id" integer,
	"variant_id" bigint,
	"merchant_id" integer,
	"product_name" varchar(255),
	"variant_name" varchar(150),
	"sku" varchar(100),
	"thumbnail_url" text,
	"variant_attributes" jsonb,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"unit_mrp" numeric(10, 2),
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" "order_items_status_enum" DEFAULT 'pending' NOT NULL,
	"delivery_otp" varchar(100),
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."order_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" "order_payments_status_enum" DEFAULT 'pending' NOT NULL,
	"gateway_order_id" varchar(255),
	"gateway_payment_id" varchar(255),
	"gateway_signature" text,
	"wallet_transaction_id" integer,
	"raw_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."order_refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"payment_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"refund_reason" text NOT NULL,
	"destination" "order_refunds_destination_enum" DEFAULT 'source' NOT NULL,
	"gateway_refund_id" varchar(255),
	"status" "order_refunds_status_enum" DEFAULT 'pending' NOT NULL,
	"processed_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."order_shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_number" varchar(60),
	"order_id" integer NOT NULL,
	"merchant_id" integer,
	"status" "order_shipments_status_enum" DEFAULT 'pending' NOT NULL,
	"subtotal_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"shipping_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"courier_partner" varchar(100),
	"awb_code" varchar(100),
	"tracking_url" text,
	"delivery_otp" varchar(10),
	"estimated_delivery_date" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."product_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" varchar(50),
	"client_id" integer NOT NULL,
	"status" "product_orders_status_enum" DEFAULT 'pending' NOT NULL,
	"payment_status" "product_orders_payment_status_enum" DEFAULT 'pending' NOT NULL,
	"subtotal_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"shipping_charge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"platform_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"payment_method" varchar(100) DEFAULT 'razorpay' NOT NULL,
	"razorpay_order_id" text,
	"shipping_address" json,
	"delivery_otp" varchar(100),
	"cancellation_reason" text,
	"coupon_code" varchar(100),
	"customer_notes" text,
	"status_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."payment_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"razorpay_signature" text,
	"amount" numeric(10, 2) NOT NULL,
	"status" "finance_payment_orders_status_enum" DEFAULT 'pending' NOT NULL,
	"notes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_orders_razorpay_order_id_unique" UNIQUE("razorpay_order_id"),
	CONSTRAINT "payment_orders_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id")
);
--> statement-breakpoint
CREATE TABLE "commerce"."product_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."product_variant_fulfillment" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" bigint NOT NULL,
	"fulfillment_type" "product_variant_fulfillment_fulfillment_type_enum" NOT NULL,
	"delivery_type" "product_variant_fulfillment_delivery_type_enum" NOT NULL,
	"shipping_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"processing_time" integer DEFAULT 0 NOT NULL,
	"estimated_delivery_min" integer DEFAULT 0 NOT NULL,
	"estimated_delivery_max" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variant_fulfillment_variant_id_unique" UNIQUE("variant_id")
);
--> statement-breakpoint
CREATE TABLE "commerce"."product_variant_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" bigint NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"reserved_stock" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variant_inventory_variant_id_unique" UNIQUE("variant_id")
);
--> statement-breakpoint
CREATE TABLE "commerce"."product_variant_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"variant_id" bigint,
	"media_id" integer NOT NULL,
	"media_role" "product_variant_media_media_role_enum",
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."product_variant_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" bigint NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"client_id" integer,
	"target_audience" "product_variant_pricing_target_audience_enum" DEFAULT 'all' NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"status" "product_variant_pricing_status_enum" DEFAULT 'active' NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"change_reason" text,
	"changed_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."product_variant_promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"discount_type" "product_variant_promotions_discount_type_enum" NOT NULL,
	"discount_value" integer NOT NULL,
	"target_audience" "product_variant_promotions_target_audience_enum" DEFAULT 'all' NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert"."profession_specializations" (
	"profession_id" integer NOT NULL,
	"specialization_id" integer NOT NULL,
	CONSTRAINT "PK_profession_specializations" PRIMARY KEY("profession_id","specialization_id")
);
--> statement-breakpoint
CREATE TABLE "expert"."professions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "consultations"."reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"order_id" integer,
	"expert_id" integer,
	"merchant_id" integer,
	"session_id" integer,
	"call_session_id" integer,
	"rating" double precision NOT NULL,
	"comment" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"review_type" varchar(20) DEFAULT 'expert' NOT NULL,
	"tags" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert"."specializations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" text,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance_before" numeric(10, 2),
	"balance_after" numeric(10, 2),
	"type" "finance_transactions_type_enum" NOT NULL,
	"purpose" "finance_transactions_purpose_enum" NOT NULL,
	"reference_id" text,
	"transaction_no" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_transaction_no_unique" UNIQUE("transaction_no")
);
--> statement-breakpoint
CREATE TABLE "commerce"."user_coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"coupon_id" integer NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp with time zone,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_coupons_client_coupon_unique" UNIQUE("client_id","coupon_id")
);
--> statement-breakpoint
CREATE TABLE "finance"."wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"expert_id" integer,
	"merchant_id" integer,
	"agent_id" integer,
	"balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"reserved_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce"."wishlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"expert_id" integer,
	"product_id" integer,
	"puja_id" integer,
	"merchant_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlists_client_product_unique" UNIQUE("client_id","product_id"),
	CONSTRAINT "wishlists_client_expert_unique" UNIQUE("client_id","expert_id"),
	CONSTRAINT "wishlists_client_puja_unique" UNIQUE("client_id","puja_id"),
	CONSTRAINT "wishlists_client_merchant_unique" UNIQUE("client_id","merchant_id")
);
--> statement-breakpoint
CREATE TABLE "finance"."withdrawals" (
	"id" serial PRIMARY KEY NOT NULL,
	"withdrawal_no" text,
	"expert_id" integer,
	"merchant_id" integer,
	"agent_profile_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"bank_account_id" integer,
	"merchant_bank_name" text,
	"merchant_account_number" varchar(255),
	"merchant_ifsc" varchar(255),
	"merchant_account_holder" text,
	"status" "finance_withdrawals_status_enum" DEFAULT 'pending' NOT NULL,
	"remark" text,
	"transaction_reference" text,
	"admin_id" integer,
	"approval_date" timestamp with time zone,
	"ip_address" varchar(100),
	"user_agent" text,
	"is_high_value" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "withdrawals_withdrawal_no_unique" UNIQUE("withdrawal_no"),
	CONSTRAINT "withdrawals_transaction_reference_unique" UNIQUE("transaction_reference")
);
--> statement-breakpoint
DROP TYPE "public"."admin_permission";--> statement-breakpoint
CREATE TYPE "public"."admin_permission" AS ENUM('dashboard', 'user_management', 'expert_management', 'agent_management', 'mandir_management', 'shop_management', 'order_management', 'payout_requests', 'refund_management', 'live_sessions', 'reviews_moderation', 'coupons_offers', 'products', 'analytics_dashboard', 'settings');--> statement-breakpoint
DROP TYPE "public"."addresses_tag_enum";--> statement-breakpoint
CREATE TYPE "public"."addresses_tag_enum" AS ENUM('home', 'office', 'other');--> statement-breakpoint
DROP TYPE "public"."addresses_type_enum";--> statement-breakpoint
CREATE TYPE "public"."addresses_type_enum" AS ENUM('primary', 'billing', 'shipping', 'other');--> statement-breakpoint
DROP TYPE "public"."call_sessions_type_enum";--> statement-breakpoint
CREATE TYPE "public"."call_sessions_type_enum" AS ENUM('audio', 'video');--> statement-breakpoint
DROP TYPE "public"."chat_messages_type_enum";--> statement-breakpoint
CREATE TYPE "public"."chat_messages_type_enum" AS ENUM('text', 'image', 'file');--> statement-breakpoint
ALTER TABLE "consultations"."call_sessions" ADD CONSTRAINT "call_sessions_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."chat_sessions" ADD CONSTRAINT "chat_sessions_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client"."favorites" ADD CONSTRAINT "favorites_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client"."wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "client"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client"."wallet_recharges" ADD CONSTRAINT "wallet_recharges_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "client"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client"."wallets" ADD CONSTRAINT "wallets_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."commission_splits" ADD CONSTRAINT "commission_splits_beneficiary_user_id_users_id_fk" FOREIGN KEY ("beneficiary_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."commission_splits" ADD CONSTRAINT "commission_splits_commission_rule_id_commission_rules_id_fk" FOREIGN KEY ("commission_rule_id") REFERENCES "finance"."commission_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."commission_tiers" ADD CONSTRAINT "commission_tiers_rule_id_commission_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "finance"."commission_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."earning_policies" ADD CONSTRAINT "earning_policies_applies_to_user_id_users_id_fk" FOREIGN KEY ("applies_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."earning_splits" ADD CONSTRAINT "earning_splits_policy_id_earning_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "finance"."earning_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."earning_tiers" ADD CONSTRAINT "earning_tiers_policy_id_earning_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "finance"."earning_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_astrology_services" ADD CONSTRAINT "expert_astrology_services_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_consultation_pricing" ADD CONSTRAINT "expert_consultation_pricing_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_consultation_pricing" ADD CONSTRAINT "expert_consultation_pricing_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_products" ADD CONSTRAINT "expert_products_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_products" ADD CONSTRAINT "expert_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "commerce"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_professions" ADD CONSTRAINT "expert_professions_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_professions" ADD CONSTRAINT "expert_professions_profession_id_professions_id_fk" FOREIGN KEY ("profession_id") REFERENCES "expert"."professions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_specializations" ADD CONSTRAINT "expert_specializations_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."expert_specializations" ADD CONSTRAINT "expert_specializations_specialization_id_specializations_id_fk" FOREIGN KEY ("specialization_id") REFERENCES "expert"."specializations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."gateway_transactions" ADD CONSTRAINT "gateway_transactions_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant"."account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support"."notifications" ADD CONSTRAINT "notifications_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."order_addresses" ADD CONSTRAINT "order_addresses_order_id_product_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce"."product_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."order_items" ADD CONSTRAINT "order_items_order_id_product_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce"."product_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."order_items" ADD CONSTRAINT "order_items_shipment_id_order_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "commerce"."order_shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "commerce"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "commerce"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."order_payments" ADD CONSTRAINT "order_payments_order_id_product_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce"."product_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."order_refunds" ADD CONSTRAINT "order_refunds_order_id_product_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce"."product_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."order_refunds" ADD CONSTRAINT "order_refunds_payment_id_order_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "commerce"."order_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."order_shipments" ADD CONSTRAINT "order_shipments_order_id_product_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce"."product_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."product_orders" ADD CONSTRAINT "product_orders_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."payment_orders" ADD CONSTRAINT "payment_orders_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."product_variant_fulfillment" ADD CONSTRAINT "product_variant_fulfillment_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "commerce"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."product_variant_inventory" ADD CONSTRAINT "product_variant_inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "commerce"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."product_variant_media" ADD CONSTRAINT "product_variant_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "commerce"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."product_variant_media" ADD CONSTRAINT "product_variant_media_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "commerce"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."product_variant_media" ADD CONSTRAINT "product_variant_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."product_variant_pricing" ADD CONSTRAINT "product_variant_pricing_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "commerce"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."product_variant_pricing" ADD CONSTRAINT "product_variant_pricing_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."product_variant_promotions" ADD CONSTRAINT "product_variant_promotions_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "commerce"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."profession_specializations" ADD CONSTRAINT "profession_specializations_profession_id_professions_id_fk" FOREIGN KEY ("profession_id") REFERENCES "expert"."professions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert"."profession_specializations" ADD CONSTRAINT "profession_specializations_specialization_id_specializations_id_fk" FOREIGN KEY ("specialization_id") REFERENCES "expert"."specializations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."reviews" ADD CONSTRAINT "reviews_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."reviews" ADD CONSTRAINT "reviews_order_id_product_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce"."product_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."reviews" ADD CONSTRAINT "reviews_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "consultations"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"."reviews" ADD CONSTRAINT "reviews_call_session_id_call_sessions_id_fk" FOREIGN KEY ("call_session_id") REFERENCES "consultations"."call_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "finance"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."user_coupons" ADD CONSTRAINT "user_coupons_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."user_coupons" ADD CONSTRAINT "user_coupons_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "commerce"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."wallets" ADD CONSTRAINT "wallets_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."wallets" ADD CONSTRAINT "wallets_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."wishlists" ADD CONSTRAINT "wishlists_client_id_account_id_fk" FOREIGN KEY ("client_id") REFERENCES "client"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce"."wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "commerce"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."withdrawals" ADD CONSTRAINT "withdrawals_expert_id_account_id_fk" FOREIGN KEY ("expert_id") REFERENCES "expert"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."withdrawals" ADD CONSTRAINT "withdrawals_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_transactions_transaction_no_idx" ON "client"."wallet_transactions" USING btree ("transaction_no");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_recharges_gateway_order_id_idx" ON "client"."wallet_recharges" USING btree ("gateway_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_expert_astrology_service" ON "expert"."expert_astrology_services" USING btree ("expert_id","service_id");--> statement-breakpoint
CREATE INDEX "IDX_expert_consultation_pricing_lookup" ON "expert"."expert_consultation_pricing" USING btree ("expert_id","target_audience","is_active","effective_from");--> statement-breakpoint
CREATE INDEX "IDX_expert_consultation_client_pricing" ON "expert"."expert_consultation_pricing" USING btree ("expert_id","client_id","is_active") WHERE "client_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_expert_profession" ON "expert"."expert_professions" USING btree ("expert_id","profession_id");--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_expert_specialization" ON "expert"."expert_specializations" USING btree ("expert_id","specialization_id");--> statement-breakpoint
CREATE INDEX "idx_product_variant_promotions_lookup" ON "commerce"."product_variant_promotions" USING btree ("variant_id","target_audience","is_active","effective_from");--> statement-breakpoint
DROP SCHEMA "auth";
--> statement-breakpoint
DROP SCHEMA "client";
--> statement-breakpoint
DROP SCHEMA "content";
--> statement-breakpoint
DROP SCHEMA "commerce";
