import { eq, and, gte, lte } from 'drizzle-orm';
import { employees, attendance, payroll } from '@shared/schema';
import { type Employee, type Attendance, type Payroll } from '@shared/schema';

interface DepartmentStats {
  department: string;
  employeeCount: number;
  total: number;
  present: number;
  absent: number;
  late: number;
  totalHours: string;
  averageHours: string;
  attendanceRate: string;
}

export async function getAttendanceByDateRange(storage: any, startDate: Date, endDate: Date): Promise<Attendance[]> {
  const result = await storage.db
    .select({
      id: attendance.id,
      employeeId: attendance.employeeId,
      date: attendance.date,
      punchIn: attendance.punchIn,
      punchOut: attendance.punchOut,
      totalHours: attendance.totalHours,
      status: attendance.status,
      location: attendance.location
    })
    .from(attendance)
    .leftJoin(employees, eq(attendance.employeeId, employees.employeeId))
    .where(
      and(
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      )
    )
    .orderBy(attendance.date);
    
  return result;
}

export async function getPayrollByDateRange(storage: any, startDate: Date, endDate: Date): Promise<Payroll[]> {
  const result = await storage.db
    .select()
    .from(payroll)
    .where(
      and(
        gte(payroll.createdAt, startDate),
        lte(payroll.createdAt, endDate)
      )
    )
    .orderBy(payroll.createdAt);
  
  return result;
}

export async function getEmployeesByDepartment(storage: any, department?: string): Promise<Employee[]> {
  if (!department || department === 'all') {
    return storage.db.select().from(employees);
  }
  
  return storage.db
    .select()
    .from(employees)
    .where(eq(employees.department, department));
}

export async function getDepartmentStats(storage: any, startDate: Date, endDate: Date): Promise<DepartmentStats[]> {
  const empList = await getEmployeesByDepartment(storage);
  const attendance = await getAttendanceByDateRange(storage, startDate, endDate);
  
  const stats = Object.entries(
    empList.reduce((acc: Record<string, {
      total: number;
      present: number;
      absent: number;
      late: number;
      employees: number;
      totalHours: number;
    }>, emp) => {
      const dept = emp.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          employees: 0,
          totalHours: 0
        };
      }
      acc[dept].employees++;
      
      const empAttendance = attendance.filter(att => att.employeeId === emp.employeeId);
      empAttendance.forEach(att => {
        acc[dept].total++;
        if (att.status === 'present') acc[dept].present++;
        if (att.status === 'absent') acc[dept].absent++;
        if (att.status === 'late') acc[dept].late++;
        if (att.totalHours) {
          acc[dept].totalHours += Number(att.totalHours);
        }
      });
      
      return acc;
    }, {})
  ).map(([department, stats]) => ({
    department,
    employeeCount: stats.employees,
    total: stats.total,
    present: stats.present,
    absent: stats.absent,
    late: stats.late,
    totalHours: stats.totalHours.toFixed(2),
    averageHours: stats.total > 0 ? (stats.totalHours / stats.total).toFixed(2) : '0',
    attendanceRate: stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : '0'
  }));

  return stats;

}

export async function getEmployeeAttendanceStats(storage: any, employeeId: string, startDate: Date, endDate: Date) {
  const attendance = await getAttendanceByDateRange(storage, startDate, endDate);
  const empAttendance = attendance.filter(att => att.employeeId === employeeId);
  
  const totalDays = empAttendance.length;
  const presentDays = empAttendance.filter(att => att.status === 'present').length;
  const lateDays = empAttendance.filter(att => att.status === 'late').length;
  const absentDays = empAttendance.filter(att => att.status === 'absent').length;
  const totalHours = empAttendance.reduce((sum, att) => {
    return sum + (att.totalHours ? parseFloat(att.totalHours) : 0);
  }, 0);
  
  return {
    totalDays,
    presentDays,
    lateDays,
    absentDays,
    attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
    averageHours: totalDays > 0 ? (totalHours / totalDays).toFixed(2) : '0',
    totalHours: totalHours.toFixed(2)
  };
}
