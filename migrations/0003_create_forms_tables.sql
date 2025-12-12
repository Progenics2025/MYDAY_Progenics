-- Migration: create or replace forms-related tables
-- Drops existing tables (if any) and creates leave_requests, expenses, documents


BEGIN;

-- Drop tables if they already exist to ensure a clean create
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;

-- Documents table (IDs and foreign keys stored as varchars to match Drizzle schema)
CREATE TABLE documents (
	id varchar(36) PRIMARY KEY,
	employee_id varchar(50) NOT NULL,
	employee_name varchar(255),
	document_type varchar(100) NOT NULL,
	document_name varchar(255) NOT NULL,
	file_url varchar(500) NOT NULL,
	file_size integer,
	mime_type varchar(100),
	uploaded_by varchar(50),
	is_verified boolean DEFAULT false,
	verified_by varchar(50),
	verified_at timestamptz,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

-- Expenses table
CREATE TABLE expenses (
	id varchar(36) PRIMARY KEY,
	employee_id varchar(50) NOT NULL,
	employee_name varchar(255),
	title varchar(255) NOT NULL,
	description text,
	amount numeric(10,2) NOT NULL DEFAULT 0,
	category varchar(50) NOT NULL,
	date timestamptz NOT NULL,
	receipt_url varchar(500),
	status varchar(20) DEFAULT 'pending',
	approved_by varchar(50),
	approved_at timestamptz,
	remarks text,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

-- Leave requests table
CREATE TABLE leave_requests (
	id varchar(36) PRIMARY KEY,
	employee_id varchar(50) NOT NULL,
	employee_name varchar(255),
	leave_type varchar(50) NOT NULL,
	start_date timestamptz NOT NULL,
	end_date timestamptz NOT NULL,
	total_days numeric(5,1) NOT NULL,
	reason text NOT NULL,
	status varchar(20) DEFAULT 'pending',
	approved_by varchar(36),
	approved_at timestamptz,
	remarks text,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

COMMIT;

