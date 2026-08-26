CREATE TABLE "credit_account" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transaction" (
	"id" text PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid()::text NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"description" text NOT NULL,
	"reference_type" text NOT NULL,
	"reference_id" text NOT NULL,
	"purchase_id" text,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_transaction_type_check" CHECK ("credit_transaction"."type" in ('purchase', 'consumption', 'refund', 'adjustment')),
	CONSTRAINT "credit_transaction_amount_check" CHECK ("credit_transaction"."amount" <> 0),
	CONSTRAINT "credit_transaction_description_check" CHECK (length("credit_transaction"."description") > 0 and length("credit_transaction"."description") <= 500),
	CONSTRAINT "credit_transaction_reference_type_check" CHECK (length("credit_transaction"."reference_type") > 0 and length("credit_transaction"."reference_type") <= 100),
	CONSTRAINT "credit_transaction_reference_id_check" CHECK (length("credit_transaction"."reference_id") > 0 and length("credit_transaction"."reference_id") <= 255)
);
--> statement-breakpoint
ALTER TABLE "credit_account" ADD CONSTRAINT "credit_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_purchase_id_billing_purchase_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."billing_purchase"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_transaction_reference_uidx" ON "credit_transaction" USING btree ("user_id","reference_type","reference_id","type");--> statement-breakpoint
CREATE INDEX "credit_transaction_user_created_idx" ON "credit_transaction" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_transaction_purchase_idx" ON "credit_transaction" USING btree ("purchase_id");