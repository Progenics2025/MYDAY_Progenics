import { Router } from 'express';
import { storage } from '../db-storage';
import { z } from 'zod';
import type { Request } from 'express';
// server/types.ts currently empty in this workspace; fallback to a local minimal interface
interface AuthenticatedRequest extends Request {
  user?: { id: string } | null;
}

const router = Router();

const dateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  department: z.string().optional(),
  reportType: z.enum(['attendance', 'payroll', 'employee']),
});

router.get('/attendance', async (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate, department } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    // Get all attendance within date range
    const attendanceRecords = await storage.getAttendanceByDateRange(start, end);

    // Get all employees for department filtering and data enrichment
    const employees = await storage.getEmployees();
    console.log(`[Reports] Fetched ${employees.length} employees for attendance report`);

    // Get department statistics in parallel
    const deptStats = await storage.getDepartmentStats(start, end);

    // Filter and enrich attendance data
    const enrichedRecords = attendanceRecords
      .map(record => {
        const employee = employees.find(emp => emp.employeeId === record.employeeId);
        if (!employee) return null;

        // Filter by department if specified
        if (department && department !== 'all' && employee.department !== department) {
          return null;
        }

        return {
          date: record.date.toISOString().split('T')[0],
          employeeId: record.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          status: record.status,
          punchIn: record.punchIn,
          punchOut: record.punchOut,
          totalHours: record.totalHours || null
        };
      })
      .filter((record): record is NonNullable<typeof record> => record !== null);

    res.json({
      attendance: enrichedRecords,
      departmentStats: deptStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch attendance report', error });
  }
});

router.get('/payroll', async (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate, department } = req.query;

    // Get all payroll records within date range
    const payrollRecords = await storage.getPayrollByDateRange(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    // Get all employees for filtering and data enrichment
    const employees = await storage.getEmployees();

    // Filter and enrich payroll data
    const enrichedRecords = payrollRecords
      .map(record => {
        // payroll.record.employeeId may be either the employee uuid (emp.id) or the human-friendly employeeId (emp.employeeId)
        const employee = employees.find(emp => emp.id === record.employeeId || emp.employeeId === record.employeeId);
        if (!employee) return null;

        // Filter by department if specified
        if (department && department !== 'all' && employee.department !== department) {
          return null;
        }

        return {
          ...record,
          // normalize employee id to the human-readable employeeId and include employeeName for client exports
          employeeId: employee.employeeId || record.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          role: employee.role
        };
      })
      .filter(record => record !== null);

    res.json(enrichedRecords);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payroll report', error });
  }
});

router.get('/employee', async (req: AuthenticatedRequest, res) => {
  try {
    const { department } = req.query;

    // Get all employees
    const employees = await storage.getEmployees();

    // Filter by department if specified
    const filteredEmployees = department && department !== 'all'
      ? employees.filter(emp => emp.department === department)
      : employees;

    // Get attendance stats for each employee
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const attendanceStats = await Promise.all(
      filteredEmployees.map(async (emp) => {
        const monthAttendance = await storage.getAttendanceByDateRange(startOfMonth, today);
        const empAttendance = monthAttendance.filter(att => att.employeeId === emp.employeeId);

        const totalDays = empAttendance.length;
        const presentDays = empAttendance.filter(att => att.status === 'present').length;
        const lateDays = empAttendance.filter(att => att.status === 'late').length;

        return {
          employeeId: emp.employeeId,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          role: emp.role,
          joinDate: emp.joinDate,
          status: emp.status,
          attendanceStats: {
            totalDays,
            presentDays,
            lateDays,
            attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0
          }
        };
      })
    );

    res.json(attendanceStats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employee report', error });
  }
});

router.get('/department-stats', async (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    const employees = await storage.getEmployees();
    console.log(`[Reports] Fetched ${employees.length} employees for department stats`);

    const attendance = await storage.getAttendanceByDateRange(start, end);

    // Calculate department-wise statistics
    const deptStats = employees.reduce((acc: any, emp) => {
      const dept = emp.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          employees: 0
        };
      }
      acc[dept].employees++;

      const empAttendance = attendance.filter(att => att.employeeId === emp.employeeId);
      empAttendance.forEach(att => {
        acc[dept].total++;
        const statusKey = att.status || 'unknown';
        if (typeof acc[dept][statusKey] === 'number') {
          acc[dept][statusKey]++;
        }
      });

      return acc;
    }, {});

    const stats = Object.entries(deptStats).map(([dept, stats]: [string, any]) => ({
      department: dept,
      employeeCount: stats.employees,
      attendanceRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
      ...stats
    }));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch department statistics', error });
  }
});

export default router;
