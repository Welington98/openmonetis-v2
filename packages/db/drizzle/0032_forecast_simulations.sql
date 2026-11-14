CREATE TABLE "forecast_simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" varchar(120) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"installment_count" integer DEFAULT 1 NOT NULL,
	"first_period" varchar(7) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forecast_simulations_amount_positive_check" CHECK ("forecast_simulations"."amount" > 0),
	CONSTRAINT "forecast_simulations_installment_count_check" CHECK ("forecast_simulations"."installment_count" BETWEEN 1 AND 60),
	CONSTRAINT "forecast_simulations_first_period_format_check" CHECK ("forecast_simulations"."first_period" ~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$')
);
--> statement-breakpoint
ALTER TABLE "forecast_simulations" ADD CONSTRAINT "forecast_simulations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forecast_simulations_user_id_idx" ON "forecast_simulations" USING btree ("user_id","created_at");