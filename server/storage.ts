import { type User, type NewUser, type Employee, type NewEmployee, type Attendance, type NewAttendance, type Payroll, type NewPayroll } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: NewUser): Promise<User>;

  // Employee operations
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByUserId(userId: string): Promise<Employee | undefined>;
  createEmployee(employee: NewEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;
  searchEmployees(query: string, filters?: { department?: string; role?: string; status?: string }): Promise<Employee[]>;

  // Attendance operations
  getAttendance(employeeId: string, date?: Date): Promise<Attendance[]>;

  // GPS Location operations
  createGPSLocation(location: { attendanceId: string; latitude: number; longitude: number; accuracy: number | null; timestamp: Date }): Promise<any>;
  getGPSLocations(attendanceId: string): Promise<any[]>;
  getGPSLocationsForAttendances?(attendanceIds: string[]): Promise<Map<string, any[]>>;

  // Expense operations
  createExpense(expense: { employeeId: string; date: string; category: string; amount: number; description: string; receiptUrl: string | null; status: string }): Promise<any>;
  getExpenses(employeeId: string): Promise<any[]>;
  updateExpenseStatus(id: string, status: string, approvedBy: string): Promise<any>;

  // Leave Request operations
  createLeaveRequest(request: { employeeId: string; startDate: string; endDate: string; type: string; reason: string; status: string }): Promise<any>;
  getLeaveRequests(employeeId: string): Promise<any[]>;
  updateLeaveRequestStatus(id: string, status: string, approvedBy: string): Promise<any>;

  // Document operations
  createDocument(document: { employeeId: string; type: string; name: string; url: string; uploadedBy: string; status: string }): Promise<any>;
  getDocuments(employeeId: string): Promise<any[]>;

  // Profile operations
  updateEmployeeProfile(profile: { employeeId: string; phoneNumber?: string; emergencyContact?: string; address?: string; dateOfBirth?: string; gender?: string; bloodGroup?: string; maritalStatus?: string; photo?: string; skills: string[]; education: string[]; experience: string[] }): Promise<any>;
  getEmployeeProfile(employeeId: string): Promise<any>;
  getTodayAttendance(employeeId: string): Promise<Attendance | undefined>;
  createAttendance(attendance: NewAttendance): Promise<Attendance>;
  updateAttendance(id: string, attendance: Partial<Attendance>): Promise<Attendance | undefined>;
  getAttendanceByPeriod(startDate: Date, endDate: Date): Promise<Attendance[]>;
  getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]>;

  // Payroll operations
  getPayroll(employeeId?: string, period?: string): Promise<Payroll[]>;
  createPayroll(payroll: NewPayroll): Promise<Payroll>;
  updatePayroll(id: string, payroll: Partial<Payroll>): Promise<Payroll | undefined>;
  getPayrollByPeriod(period: string): Promise<Payroll[]>;
  getPayrollByDateRange(startDate: Date, endDate: Date): Promise<Payroll[]>;

  // Statistics
  getDepartmentStats(startDate: Date, endDate: Date): Promise<Array<{
    department: string;
    employeeCount: number;
    attendanceRate: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    totalHours: number;
    averageHours: string;
  }>>;

  // Leave balance operations
  getLeaveBalances(employeeId: string): Promise<{ casualLeave: number; sickLeave: number; earnedLeave: number } | undefined>;
  updateLeaveBalances(employeeId: string, balances: { casualLeave?: number; sickLeave?: number; earnedLeave?: number }): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private employees: Map<string, Employee>;
  private attendance: Map<string, Attendance>;
  private payroll: Map<string, Payroll>;
  private profiles: Map<string, any>;

  constructor() {
    this.users = new Map();
    this.employees = new Map();
    this.attendance = new Map();
    this.payroll = new Map();
    this.profiles = new Map();

    // Initialize with admin user
    this.initializeData();
  }

  private async initializeData() {
    // Create admin user
    const adminUser = await this.createUser({
      username: "admin",
      password: "admin123", // In production, this should be hashed
      role: "admin",
      name: "John Doe",
      email: "admin@company.com",
      id: randomUUID(),
    } as any);

    // Create sample employee for admin
    await this.createEmployee({
      userId: adminUser.id,
      employeeId: "EMP001",
      firstName: "John",
      lastName: "Doe",
      email: "admin@company.com",
      department: "HR",
      role: "Manager",
      salary: "75000",
      status: "active",
      joinDate: new Date("2023-01-15"),
      id: randomUUID(),
    } as any);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: NewUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      name: insertUser.name,
      role: insertUser.role || "employee",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    this.users.set(id, user);
    return user;
  }

  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getEmployeeByUserId(userId: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(emp => emp.userId === userId);
  }

  async createEmployee(insertEmployee: NewEmployee): Promise<Employee> {
    const id = randomUUID();
    const employee: Employee = {
      id,
      userId: insertEmployee.userId || null,
      employeeId: insertEmployee.employeeId,
      firstName: insertEmployee.firstName,
      lastName: insertEmployee.lastName,
      email: insertEmployee.email,
      department: insertEmployee.department || null,
      role: insertEmployee.role || null,
      salary: insertEmployee.salary || null,
      status: insertEmployee.status || "active",
      joinDate: insertEmployee.joinDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    this.employees.set(id, employee);
    return employee;
  }

  async getLeaveBalances(employeeId: string): Promise<{ casualLeave: number; sickLeave: number; earnedLeave: number } | undefined> {
    const emp = Array.from(this.employees.values()).find(e => e.employeeId === employeeId || e.id === employeeId);
    if (!emp) return undefined;
    return {
      casualLeave: (emp as any).casualLeave ?? 12,
      sickLeave: (emp as any).sickLeave ?? 12,
      earnedLeave: (emp as any).earnedLeave ?? 15,
    };
  }

  async updateLeaveBalances(employeeId: string, balances: { casualLeave?: number; sickLeave?: number; earnedLeave?: number }): Promise<any> {
    const empKey = Array.from(this.employees.keys()).find(k => {
      const e = this.employees.get(k);
      return e && (e.employeeId === employeeId || e.id === employeeId);
    });
    if (!empKey) return undefined;
    const emp = this.employees.get(empKey) as any;
    const updated = { ...emp };
    if (balances.casualLeave !== undefined) updated.casualLeave = balances.casualLeave;
    if (balances.sickLeave !== undefined) updated.sickLeave = balances.sickLeave;
    if (balances.earnedLeave !== undefined) updated.earnedLeave = balances.earnedLeave;
    this.employees.set(empKey, updated);
    return updated;
  }

  async updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;

    const updated = { ...employee, ...employeeData };
    this.employees.set(id, updated);
    return updated;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return this.employees.delete(id);
  }

  async searchEmployees(query: string, filters?: { department?: string; role?: string; status?: string }): Promise<Employee[]> {
    let employees = Array.from(this.employees.values());

    if (query) {
      const lowerQuery = query.toLowerCase();
      employees = employees.filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(lowerQuery) ||
        emp.email.toLowerCase().includes(lowerQuery) ||
        emp.employeeId.toLowerCase().includes(lowerQuery)
      );
    }

    if (filters?.department) {
      employees = employees.filter(emp => emp.department === filters.department);
    }

    if (filters?.role) {
      employees = employees.filter(emp => emp.role === filters.role);
    }

    if (filters?.status) {
      employees = employees.filter(emp => emp.status === filters.status);
    }

    return employees;
  }

  // Attendance operations
  async getAttendance(employeeId: string, date?: Date): Promise<Attendance[]> {
    let records = Array.from(this.attendance.values()).filter(att => att.employeeId === employeeId);

    if (date) {
      const targetDate = date.toDateString();
      records = records.filter(att => att.date.toDateString() === targetDate);
    }

    return records.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getTodayAttendance(employeeId: string): Promise<Attendance | undefined> {
    const today = new Date().toDateString();
    return Array.from(this.attendance.values()).find(att =>
      att.employeeId === employeeId && att.date.toDateString() === today
    );
  }

  async getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]> {
    return Array.from(this.attendance.values())
      .filter(att => {
        const date = new Date(att.date);
        return date >= startDate && date <= endDate;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getPayrollByDateRange(startDate: Date, endDate: Date): Promise<Payroll[]> {
    return Array.from(this.payroll.values())
      .filter(pay => {
        const date = new Date(pay.paymentDate || new Date());
        return date >= startDate && date <= endDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.paymentDate || new Date());
        const dateB = new Date(b.paymentDate || new Date());
        return dateA.getTime() - dateB.getTime();
      });
  }

  async getDepartmentStats(startDate: Date, endDate: Date): Promise<Array<{
    department: string;
    employeeCount: number;
    attendanceRate: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    totalHours: number;
    averageHours: string;
  }>> {
    const employees = await this.getEmployees();
    const attendance = await this.getAttendanceByDateRange(startDate, endDate);

    // Group employees by department
    const deptMap = employees.reduce((acc, emp) => {
      const dept = emp.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = {
          department: dept,
          employeeCount: 0,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          totalHours: 0,
          averageHours: '0'
        };
      }
      acc[dept].employeeCount++;
      return acc;
    }, {} as Record<string, {
      department: string;
      employeeCount: number;
      total: number;
      present: number;
      absent: number;
      late: number;
      totalHours: number;
      averageHours: string;
    }>);

    // Calculate attendance stats for each department
    attendance.forEach(record => {
      const emp = employees.find(e => e.employeeId === record.employeeId);
      if (!emp || !record.status) return;

      const dept = emp.department || 'Unassigned';
      const stats = deptMap[dept];

      stats.total++;
      if (record.status === 'present') stats.present++;
      else if (record.status === 'absent') stats.absent++;
      else if (record.status === 'late') stats.late++;

      if (record.totalHours) {
        stats.totalHours += parseFloat(record.totalHours) || 0;
      }
    });

    // Calculate averages and format stats
    return Object.values(deptMap).map(stats => ({
      ...stats,
      attendanceRate: stats.total > 0 ? (stats.present / stats.total * 100).toFixed(1) : '0',
      averageHours: stats.total > 0 ? (stats.totalHours / stats.total).toFixed(1) : '0'
    }));
  }

  async createAttendance(insertAttendance: NewAttendance): Promise<Attendance> {
    const id = randomUUID();
    const attendance: Attendance = {
      id,
      date: insertAttendance.date,
      employeeId: insertAttendance.employeeId,
      punchIn: insertAttendance.punchIn || null,
      punchOut: insertAttendance.punchOut || null,
      totalHours: insertAttendance.totalHours || null,
      status: insertAttendance.status || null,
      notes: insertAttendance.notes || null,
      location: insertAttendance.location || null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;
    this.attendance.set(id, attendance);
    return attendance;
  }

  async updateAttendance(id: string, attendanceData: Partial<Attendance>): Promise<Attendance | undefined> {
    const attendance = this.attendance.get(id);
    if (!attendance) return undefined;

    const updated = { ...attendance, ...attendanceData };
    this.attendance.set(id, updated);
    return updated;
  }

  async getAttendanceByPeriod(startDate: Date, endDate: Date): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(att =>
      att.date >= startDate && att.date <= endDate
    );
  }

  // Payroll operations
  async getPayroll(employeeId?: string, period?: string): Promise<Payroll[]> {
    let records = Array.from(this.payroll.values());

    if (employeeId) {
      records = records.filter(pay => pay.employeeId === employeeId);
    }

    if (period) {
      const [month, year] = period.split('-').map(Number);
      records = records.filter(pay => pay.month === month && pay.year === year);
    }

    return records.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createPayroll(insertPayroll: NewPayroll): Promise<Payroll> {
    const id = randomUUID();
    const payroll: Payroll = {
      id,
      employeeId: insertPayroll.employeeId,
      month: insertPayroll.month,
      year: insertPayroll.year,
      basicSalary: insertPayroll.basicSalary,
      hra: insertPayroll.hra,
      transportAllowance: insertPayroll.transportAllowance,
      medicalAllowance: insertPayroll.medicalAllowance,
      otherAllowances: insertPayroll.otherAllowances,
      grossSalary: insertPayroll.grossSalary,
      providentFund: insertPayroll.providentFund,
      esi: insertPayroll.esi,
      professionalTax: insertPayroll.professionalTax,
      incomeTax: insertPayroll.incomeTax,
      totalDeductions: insertPayroll.totalDeductions,
      netSalary: insertPayroll.netSalary,
      paymentDate: insertPayroll.paymentDate || null,
      status: insertPayroll.status || null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;
    this.payroll.set(id, payroll);
    return payroll;
  }

  async updatePayroll(id: string, payrollData: Partial<Payroll>): Promise<Payroll | undefined> {
    const payroll = this.payroll.get(id);
    if (!payroll) return undefined;

    const updated = { ...payroll, ...payrollData };
    this.payroll.set(id, updated);
    return updated;
  }

  async getPayrollByPeriod(period: string): Promise<Payroll[]> {
    const [month, year] = period.split('-').map(Number);
    return Array.from(this.payroll.values()).filter(pay => pay.month === month && pay.year === year);
  }

  // GPS Location operations
  async createGPSLocation(location: { attendanceId: string; latitude: number; longitude: number; accuracy: number | null; timestamp: Date }): Promise<any> {
    // For now, just return a mock response - in a real app this would store in a GPS locations table
    return { id: randomUUID(), ...location };
  }

  async getGPSLocations(attendanceId: string): Promise<any[]> {
    // Mock implementation - in a real app this would query GPS locations table
    return [];
  }

  // Expense operations
  async createExpense(expense: { employeeId: string; date: string; category: string; amount: number; description: string; receiptUrl: string | null; status: string }): Promise<any> {
    return { id: randomUUID(), ...expense, createdAt: new Date() };
  }

  async getExpenses(employeeId: string): Promise<any[]> {
    // Mock implementation - would query expenses table
    return [];
  }

  async updateExpenseStatus(id: string, status: string, approvedBy: string): Promise<any> {
    return { id, status, approvedBy, approvedAt: new Date() };
  }

  // Leave Request operations
  async createLeaveRequest(request: { employeeId: string; startDate: string; endDate: string; type: string; reason: string; status: string }): Promise<any> {
    return { id: randomUUID(), ...request, createdAt: new Date() };
  }

  async getLeaveRequests(employeeId: string): Promise<any[]> {
    // Mock implementation - would query leave_requests table
    return [];
  }

  async updateLeaveRequestStatus(id: string, status: string, approvedBy: string): Promise<any> {
    return { id, status, approvedBy, approvedAt: new Date() };
  }

  // Document operations
  async createDocument(document: { employeeId: string; type: string; name: string; url: string; uploadedBy: string; status: string }): Promise<any> {
    return { id: randomUUID(), ...document, createdAt: new Date() };
  }

  async getDocuments(employeeId: string): Promise<any[]> {
    // Mock implementation - would query documents table
    return [];
  }

  // Profile operations
  async updateEmployeeProfile(profile: { employeeId: string; phoneNumber?: string; emergencyContact?: string; address?: string; dateOfBirth?: string; bloodGroup?: string; maritalStatus?: string; photo?: string; skills: string[]; education: string[]; experience: string[] }): Promise<any> {
    const existing = this.profiles.get(profile.employeeId) || {};
    const merged = { ...existing, ...profile, updatedAt: new Date() };
    this.profiles.set(profile.employeeId, merged);
    return merged;
  }

  async getEmployeeProfile(employeeId: string): Promise<any> {
    // Return stored profile if present
    const stored = this.profiles.get(employeeId);
    if (stored) return stored;

    // If no profile stored, attempt to create a sensible default from employee record
    const employee = Array.from(this.employees.values()).find(emp => emp.employeeId === employeeId || emp.id === employeeId);
    if (!employee) return null;

    const defaultProfile = {
      employeeId: employee.employeeId,
      phoneNumber: null,
      emergencyContact: null,
      address: null,
      dateOfBirth: employee.dateOfBirth || null,
      bloodGroup: null,
      maritalStatus: null,
      photo: null,
      skills: [],
      education: [],
      experience: [],
      updatedAt: new Date()
    };

    this.profiles.set(employee.employeeId, defaultProfile);
    return defaultProfile;
  }
}

export const storage = new MemStorage();
