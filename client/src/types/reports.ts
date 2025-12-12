export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  status: 'active' | 'inactive';
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'late';
  totalHours: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  deductions: number;
  additions: number;
  netSalary: number;
}

export interface DepartmentStats {
  department: string;
  total: number;
  present: number;
  employeeCount: number;
  totalHours: string;
}

export interface ReportData {
  attendance?: Attendance[];
  employees?: Employee[];
  payroll?: Payroll[];
  departmentStats: DepartmentStats[];
}

export type ReportType = 'attendance' | 'payroll' | 'employee';
export type DateRange = 'current' | 'last' | 'quarter' | 'year' | 'all';
export type ExportFormat = 'pdf' | 'excel';
