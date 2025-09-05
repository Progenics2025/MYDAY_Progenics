import { z } from "zod";
import { pgTable, text, serial, timestamp, integer, decimal, boolean, varchar, json } from "drizzle-orm/pg-core";

// Database Tables
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("employee"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employees = pgTable("employees", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  employeeId: varchar("employee_id", { length: 50 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  department: varchar("department", { length: 100 }),
  role: varchar("role", { length: 100 }),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }),
  hra: decimal("hra", { precision: 10, scale: 2 }),
  transportAllowance: decimal("transport_allowance", { precision: 10, scale: 2 }),
  medicalAllowance: decimal("medical_allowance", { precision: 10, scale: 2 }),
  otherAllowances: decimal("other_allowances", { precision: 10, scale: 2 }),
  joinDate: timestamp("join_date"),
  status: varchar("status", { length: 20 }).default("active"),
  address: text("address"),
  dateOfBirth: timestamp("date_of_birth"),
  emergencyContact: varchar("emergency_contact", { length: 20 }),
  bloodGroup: varchar("blood_group", { length: 5 }),
  maritalStatus: varchar("marital_status", { length: 20 }),
  panNumber: varchar("pan_number", { length: 10 }),
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }),
  uanNumber: varchar("uan_number", { length: 12 }),
  esicNumber: varchar("esic_number", { length: 17 }),
  bankAccount: varchar("bank_account", { length: 20 }),
  ifscCode: varchar("ifsc_code", { length: 11 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  date: timestamp("date").notNull(),
  punchIn: timestamp("punch_in"),
  punchOut: timestamp("punch_out"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 20 }).default("present"),
  notes: text("notes"),
  location: json("location"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payroll = pgTable("payroll", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }).notNull(),
  hra: decimal("hra", { precision: 10, scale: 2 }).notNull(),
  transportAllowance: decimal("transport_allowance", { precision: 10, scale: 2 }).notNull(),
  medicalAllowance: decimal("medical_allowance", { precision: 10, scale: 2 }).notNull(),
  otherAllowances: decimal("other_allowowances", { precision: 10, scale: 2 }).notNull(),
  grossSalary: decimal("gross_salary", { precision: 10, scale: 2 }).notNull(),
  providentFund: decimal("provident_fund", { precision: 10, scale: 2 }).notNull(),
  esi: decimal("esi", { precision: 10, scale: 2 }).notNull(),
  professionalTax: decimal("professional_tax", { precision: 10, scale: 2 }).notNull(),
  incomeTax: decimal("income_tax", { precision: 10, scale: 2 }).notNull(),
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).notNull(),
  netSalary: decimal("net_salary", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  date: timestamp("date").notNull(),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  status: varchar("status", { length: 20 }).default("pending"),
  approvedBy: varchar("approved_by", { length: 50 }),
  approvedAt: timestamp("approved_at"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  leaveType: varchar("leave_type", { length: 50 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  approvedBy: varchar("approved_by", { length: 50 }),
  approvedAt: timestamp("approved_at"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  documentType: varchar("document_type", { length: 100 }).notNull(),
  documentName: varchar("document_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedBy: varchar("uploaded_by", { length: 50 }),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by", { length: 50 }),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod Schemas for validation
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  salary: z.string().optional(),
  basicSalary: z.string().optional(),
  hra: z.string().optional(),
  transportAllowance: z.string().optional(),
  medicalAllowance: z.string().optional(),
  otherAllowances: z.string().optional(),
  joinDate: z.string().optional(),
  status: z.enum(["active", "inactive", "terminated"]).default("active"),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.string().optional(),
  bloodGroup: z.string().optional(),
  maritalStatus: z.string().optional(),
  panNumber: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  esicNumber: z.string().optional(),
  bankAccount: z.string().optional(),
  ifscCode: z.string().optional(),
});

export const insertAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  date: z.string(),
  punchIn: z.string().optional(),
  punchOut: z.string().optional(),
  totalHours: z.string().optional(),
  status: z.enum(["present", "absent", "late", "half-day"]).default("present"),
  notes: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
  }).optional(),
});

export const insertPayrollSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  basicSalary: z.string(),
  hra: z.string(),
  transportAllowance: z.string(),
  medicalAllowance: z.string(),
  otherAllowances: z.string(),
  grossSalary: z.string(),
  providentFund: z.string(),
  esi: z.string(),
  professionalTax: z.string(),
  incomeTax: z.string(),
  totalDeductions: z.string(),
  netSalary: z.string(),
  paymentDate: z.string().optional(),
  status: z.enum(["pending", "paid", "failed"]).default("pending"),
});

export const insertExpenseSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
  date: z.string(),
  receiptUrl: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  remarks: z.string().optional(),
});

export const insertLeaveRequestSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string(),
  endDate: z.string(),
  totalDays: z.number().positive("Total days must be positive"),
  reason: z.string().min(1, "Reason is required"),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  remarks: z.string().optional(),
});

export const insertDocumentSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  documentType: z.string().min(1, "Document type is required"),
  documentName: z.string().min(1, "Document name is required"),
  fileUrl: z.string().min(1, "File URL is required"),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  uploadedBy: z.string().optional(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;
export type Payroll = typeof payroll.$inferSelect;
export type NewPayroll = typeof payroll.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;