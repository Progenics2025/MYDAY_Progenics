CREATE TABLE "attendance" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"date" timestamp NOT NULL,
	"punch_in" timestamp,
	"punch_out" timestamp,
	"total_hours" numeric(5, 2),
	"status" varchar(20) DEFAULT 'present',
	"notes" text,
	"location" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"uploaded_by" varchar(50),
	"is_verified" boolean DEFAULT false,
	"verified_by" varchar(50),
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"employee_id" varchar(50) NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"department" varchar(100),
	"role" varchar(100),
	"salary" numeric(10, 2),
	"basic_salary" numeric(10, 2),
	"hra" numeric(10, 2),
	"transport_allowance" numeric(10, 2),
	"medical_allowance" numeric(10, 2),
	"other_allowances" numeric(10, 2),
	"join_date" timestamp,
	"status" varchar(20) DEFAULT 'active',
	"address" text,
	"date_of_birth" timestamp,
	"emergency_contact" varchar(20),
	"blood_group" varchar(5),
	"marital_status" varchar(20),
	"pan_number" varchar(10),
	"aadhaar_number" varchar(12),
	"uan_number" varchar(12),
	"esic_number" varchar(17),
	"bank_account" varchar(20),
	"ifsc_code" varchar(11),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"category" varchar(50) NOT NULL,
	"date" timestamp NOT NULL,
	"receipt_url" varchar(500),
	"status" varchar(20) DEFAULT 'pending',
	"approved_by" varchar(50),
	"approved_at" timestamp,
	"remarks" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gps_locations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"attendance_id" varchar(36),
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"accuracy" numeric(10, 2),
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"leave_type" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"approved_by" varchar(36),
	"approved_at" timestamp,
	"total_days" numeric(5, 1) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"basic_salary" numeric(10, 2) NOT NULL,
	"hra" numeric(10, 2) NOT NULL,
	"transport_allowance" numeric(10, 2) NOT NULL,
	"medical_allowance" numeric(10, 2) NOT NULL,
	"other_allowowances" numeric(10, 2) NOT NULL,
	"gross_salary" numeric(10, 2) NOT NULL,
	"provident_fund" numeric(10, 2) NOT NULL,
	"esi" numeric(10, 2) NOT NULL,
	"professional_tax" numeric(10, 2) NOT NULL,
	"income_tax" numeric(10, 2) NOT NULL,
	"total_deductions" numeric(10, 2) NOT NULL,
	"net_salary" numeric(10, 2) NOT NULL,
	"payment_date" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'employee' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gps_locations" ADD CONSTRAINT "gps_locations_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE no action ON UPDATE no action;