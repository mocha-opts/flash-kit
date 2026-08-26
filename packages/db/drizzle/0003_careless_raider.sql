CREATE TABLE "billing_event" (
	"id" text PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid()::text NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"delivery_count" integer DEFAULT 1 NOT NULL,
	"error_code" text,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "billing_event_provider_check" CHECK ("billing_event"."provider" in ('stripe', 'polar')),
	CONSTRAINT "billing_event_status_check" CHECK ("billing_event"."status" in ('received', 'processed', 'ignored', 'failed')),
	CONSTRAINT "billing_event_delivery_count_check" CHECK ("billing_event"."delivery_count" > 0),
	CONSTRAINT "billing_event_provider_event_id_check" CHECK (length("billing_event"."provider_event_id") > 0),
	CONSTRAINT "billing_event_type_check" CHECK (length("billing_event"."event_type") > 0),
	CONSTRAINT "billing_event_error_code_length_check" CHECK ("billing_event"."error_code" is null or length("billing_event"."error_code") <= 100),
	CONSTRAINT "billing_event_error_message_length_check" CHECK ("billing_event"."error_message" is null or length("billing_event"."error_message") <= 500)
);
--> statement-breakpoint
CREATE TABLE "billing_purchase" (
	"id" text PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid()::text NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_checkout_id" text,
	"product_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_purchase_provider_check" CHECK ("billing_purchase"."provider" in ('stripe', 'polar')),
	CONSTRAINT "billing_purchase_kind_check" CHECK ("billing_purchase"."kind" in ('lifetime', 'credit_pack')),
	CONSTRAINT "billing_purchase_status_check" CHECK ("billing_purchase"."status" in ('paid', 'refunded', 'partially_refunded', 'disputed')),
	CONSTRAINT "billing_purchase_amount_check" CHECK ("billing_purchase"."amount" >= 0),
	CONSTRAINT "billing_purchase_currency_check" CHECK ("billing_purchase"."currency" ~ '^[a-z]{3}$' and "billing_purchase"."currency" = lower("billing_purchase"."currency")),
	CONSTRAINT "billing_purchase_provider_order_id_check" CHECK (length("billing_purchase"."provider_order_id") > 0),
	CONSTRAINT "billing_purchase_product_id_check" CHECK (length("billing_purchase"."product_id") > 0),
	CONSTRAINT "billing_purchase_plan_id_check" CHECK (length("billing_purchase"."plan_id") > 0)
);
--> statement-breakpoint
ALTER TABLE "billing_purchase" ADD CONSTRAINT "billing_purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_event_provider_event_uidx" ON "billing_event" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_purchase_provider_order_uidx" ON "billing_purchase" USING btree ("provider","provider_order_id");--> statement-breakpoint
CREATE INDEX "billing_purchase_user_status_idx" ON "billing_purchase" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "billing_purchase_user_product_idx" ON "billing_purchase" USING btree ("user_id","product_id");