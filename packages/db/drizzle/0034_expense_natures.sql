CREATE TYPE "public"."expense_nature" AS ENUM('fixed', 'variable');--> statement-breakpoint
CREATE TABLE "expense_category_natures" (
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"nature" "expense_nature" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expense_category_natures_user_id_category_id_pk" PRIMARY KEY("user_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "installments_are_fixed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "recurring_are_fixed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_category_natures" ADD CONSTRAINT "expense_category_natures_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_category_natures" ADD CONSTRAINT "expense_category_natures_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "expense_category_natures" ADD CONSTRAINT "expense_category_natures_category_id_user_id_categories_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_category_natures_category_id_idx" ON "expense_category_natures" USING btree ("category_id");