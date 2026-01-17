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
  gender: varchar("gender", { length: 20 }),
  emergencyContact: varchar("emergency_contact", { length: 20 }),
  bloodGroup: varchar("blood_group", { length: 5 }),
  maritalStatus: varchar("marital_status", { length: 20 }),
  skills: json("skills"),
  profilePhotoUrl: varchar("profile_photo_url", { length: 500 }),
  // Leave balances (counts) - allow half day precision (scale 1)
  casualLeave: decimal("casual_leave", { precision: 5, scale: 1 }).default('12'),
  sickLeave: decimal("sick_leave", { precision: 5, scale: 1 }).default('12'),
  earnedLeave: decimal("earned_leave", { precision: 5, scale: 1 }).default('15'),
  panNumber: varchar("pan_number", { length: 10 }),
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }),
  uanNumber: varchar("uan_number", { length: 12 }),
  esicNumber: varchar("esic_number", { length: 17 }),
  bankAccount: varchar("bank_account", { length: 20 }),
  ifscCode: varchar("ifsc_code", { length: 11 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gpsLocations = pgTable("gps_locations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  attendanceId: varchar("attendance_id", { length: 36 }).references(() => attendance.id),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 10, scale: 2 }),
  address: text("address"),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type GPSLocation = typeof gpsLocations.$inferSelect;
export type NewGPSLocation = typeof gpsLocations.$inferInsert;

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
  otherAllowances: decimal("other_allowances", { precision: 10, scale: 2 }).notNull(),
  grossSalary: decimal("gross_salary", { precision: 10, scale: 2 }).notNull(),
  providentFund: decimal("provident_fund", { precision: 10, scale: 2 }).notNull(),
  esi: decimal("esi", { precision: 10, scale: 2 }).notNull(),
  professionalTax: decimal("professional_tax", { precision: 10, scale: 2 }).notNull(),
  incomeTax: decimal("income_tax", { precision: 10, scale: 2 }).notNull(),
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).notNull(),
  netSalary: decimal("net_salary", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date"),
  // New fields
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  totalDays: decimal("total_days", { precision: 5, scale: 1 }),
  daysPaid: decimal("days_paid", { precision: 5, scale: 1 }),
  arrearDays: decimal("arrear_days", { precision: 5, scale: 1 }),
  absentDays: decimal("absent_days", { precision: 5, scale: 1 }),
  lop: decimal("lop", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  // store employee display name for easy exports / UI
  employeeName: varchar("employee_name", { length: 255 }),
  leaveType: varchar("leave_type", { length: 50 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason").notNull(),
  // optional document uploaded for the leave (e.g., medical certificate)
  documentUrl: varchar("document_url", { length: 500 }),
  // store base64-encoded blob for uploaded medical documents when needed
  documentBlob: text("document_blob"),
  status: varchar("status", { length: 20 }).default("pending"),
  approvedBy: varchar("approved_by", { length: 36 }),
  approvedAt: timestamp("approved_at"),
  totalDays: decimal("total_days", { precision: 5, scale: 1 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  // store employee display name for easy exports / UI
  employeeName: varchar("employee_name", { length: 255 }),
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

export const documents = pgTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  // store employee display name for easy exports / UI
  employeeName: varchar("employee_name", { length: 255 }),
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
  phone: z.preprocess((val) => {
    if (val == null) return val;
    const digits = String(val).replace(/\D/g, '');
    // If includes country code like 91XXXXXXXXXX, take last 10 digits
    if (digits.length > 10) return digits.slice(-10);
    return digits;
  }, z.string().regex(/^\d{10}$/, "Phone must be a 10 digit mobile number")),
  department: z.string().min(1, "Department is required"),
  role: z.string().min(1, "Role is required"),
  salary: z.union([
    z.preprocess((v) => (v === '' ? v : v), z.string()).refine((s) => typeof s === 'string' ? /^\d+(?:\.\d{1,2})?$/.test(s) : false, { message: 'Salary must be a number' }),
    z.number(),
  ]),
  basicSalary: z.union([z.string().regex(/^\d+(?:\.\d{1,2})?$/, "Basic salary must be a number"), z.number()]).optional(),
  hra: z.union([z.string().regex(/^\d+(?:\.\d{1,2})?$/, "HRA must be a number"), z.number()]).optional(),
  transportAllowance: z.union([z.string().regex(/^\d+(?:\.\d{1,2})?$/, "Transport allowance must be a number"), z.number()]).optional(),
  medicalAllowance: z.union([z.string().regex(/^\d+(?:\.\d{1,2})?$/, "Medical allowance must be a number"), z.number()]).optional(),
  otherAllowances: z.union([z.string().regex(/^\d+(?:\.\d{1,2})?$/, "Other allowances must be a number"), z.number()]).optional(),
  joinDate: z.string().min(1, "Join date is required"),
  status: z.enum(["active", "inactive", "terminated"]).default("active"),
  address: z.string().min(1, "Address is required"),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.preprocess((val) => {
    if (val == null) return val;
    const digits = String(val).replace(/\D/g, '');
    if (digits.length > 10) return digits.slice(-10);
    return digits;
  }, z.string().regex(/^\d{10}$/, "Emergency contact must be a 10 digit number")),
  bloodGroup: z.string().optional(),
  maritalStatus: z.preprocess((v) => {
    if (v === '' || v == null) return undefined;
    return v;
  }, z.string().min(1, "Marital status is required").optional()),
  // PAN and Aadhaar are optional at creation; if provided they must match standard formats.
  panNumber: z.preprocess((v) => {
    if (v === '' || v == null) return undefined;
    return v;
  }, z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, "PAN must be in valid format").optional()),
  aadhaarNumber: z.preprocess((v) => {
    if (v === '' || v == null) return undefined;
    return v;
  }, z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits").optional()),
  uanNumber: z.preprocess((v) => {
    // Accept empty string, null or the literal 'NA' (case-insensitive) as an explicit clear (null)
    if (v === '' || v == null) return null;
    if (typeof v === 'string' && v.trim().toUpperCase() === 'NA') return null;
    return typeof v === 'string' ? v.trim() : v;
  }, z.string().regex(/^\d{12}$/, "UAN must be 12 digits").nullable().optional()),
  esicNumber: z.preprocess((v) => {
    if (v === '' || v == null) return null;
    if (typeof v === 'string' && v.trim().toUpperCase() === 'NA') return null;
    return typeof v === 'string' ? v.trim() : v;
  }, z.string().regex(/^[A-Za-z0-9-]{6,17}$/, "ESIC must be 6-17 characters").nullable().optional()),
  bankAccount: z.string().regex(/^\d{9,18}$/, "Bank account must be 9-18 digits"),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "IFSC must be in valid format"),
  skills: z.union([z.array(z.string()).min(1, "Skills are required"), z.string().min(1, "Skills are required")]),
  gender: z.string().optional(),
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
  documentUrl: z.string().optional(),
  documentBlob: z.string().optional(),
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