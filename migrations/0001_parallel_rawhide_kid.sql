ALTER TABLE "payroll" ADD COLUMN "other_allowances" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll" DROP COLUMN "other_allowowances";