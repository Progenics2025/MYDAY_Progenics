import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { insertEmployeeSchema, insertAttendanceSchema, insertPayrollSchema, loginSchema } from "@shared/schema";
import { z } from "zod";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Simple session middleware
const sessions = new Map<string, any>();

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  req.user = sessions.get(sessionId);
  next();
}

// File upload middleware
import multer from 'multer';
import path from 'path';

const multerStorage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${path.basename(file.originalname)}`);
  }
});

const upload = multer({ storage: multerStorage });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await dbStorage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const sessionId = generateSessionId();
      sessions.set(sessionId, user);
      
      const employee = await dbStorage.getEmployeeByUserId(user.id);
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          name: user.name,
          email: user.email 
        },
        employee,
        token: sessionId 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const employee = await dbStorage.getEmployeeByUserId(req.user.id);
    res.json({ 
      user: req.user,
      employee 
    });
  });

  // Employee routes
  app.get("/api/employees", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { search, department, role, status } = req.query;
      
      if (search || department || role || status) {
        const employees = await dbStorage.searchEmployees(
          search as string || "", 
          {
            department: department as string,
            role: role as string,
            status: status as string
          }
        );
        res.json(employees);
      } else {
        const employees = await dbStorage.getEmployees();
        res.json(employees);
      }
    } catch (error) {
      res.status(500).json([]);
    }
  });

  app.get("/api/employees/:id", authenticateToken, async (req, res) => {
    try {
      const employee = await dbStorage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const employeeData = insertEmployeeSchema.parse(req.body);
      
      const { firstName, lastName, email } = employeeData;
      const newUser = await dbStorage.createUser({
        username: email, // Use email as username
        password: "password123", // Default password, should be changed by user
        email,
        name: `${firstName} ${lastName}`,
        role: "employee",
      });

      const processedData = {
        ...employeeData,
        userId: newUser.id, // Link to the new user
        joinDate: employeeData.joinDate ? new Date(employeeData.joinDate) : undefined,
        dateOfBirth: employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : undefined
      };
      const employee = await dbStorage.createEmployee(processedData);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid employee data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create employee" });
      }
    }
  });

  app.put("/api/employees/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const employeeData = insertEmployeeSchema.partial().parse(req.body);
      
      // Convert date strings to Date objects if provided
      const processedData = {
        ...employeeData,
        joinDate: employeeData.joinDate ? new Date(employeeData.joinDate) : undefined,
        dateOfBirth: employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : undefined
      };
      const employee = await dbStorage.updateEmployee(req.params.id, processedData);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid employee data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update employee" });
      }
    }
  });

  app.delete("/api/employees/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const deleted = await dbStorage.deleteEmployee(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { employeeId, date } = req.query;
      
      const targetEmployeeId = employeeId as string || req.user.employeeId;
      const targetDate = date ? new Date(date as string) : undefined;
      
      const attendance = await dbStorage.getAttendance(targetEmployeeId, targetDate);
      res.json(attendance);
    } catch (error) {
      res.status(500).json([]);
    }
  });

  app.get("/api/attendance/today/:employeeId", authenticateToken, async (req, res) => {
    try {
      const attendance = await dbStorage.getTodayAttendance(req.params.employeeId);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's attendance" });
    }
  });

  app.post("/api/attendance/punch-in", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const employee = await dbStorage.getEmployeeByUserId(req.user.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee profile not found" });
      }

      const today = new Date();
      const existingAttendance = await dbStorage.getTodayAttendance(employee.employeeId);
      
      if (existingAttendance) {
        return res.status(400).json({ message: "Already punched in today" });
      }

      const attendanceData = {
        employeeId: employee.employeeId,
        date: today,
        punchIn: today,
        punchOut: null,
        status: "present",
        totalHours: null
      };

      const attendance = await dbStorage.createAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to punch in" });
    }
  });

  app.post("/api/attendance/punch-out", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const employee = await dbStorage.getEmployeeByUserId(req.user.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee profile not found" });
      }

      const existingAttendance = await dbStorage.getTodayAttendance(employee.employeeId);
      
      if (!existingAttendance || !existingAttendance.punchIn) {
        return res.status(400).json({ message: "Must punch in first" });
      }

      if (existingAttendance.punchOut) {
        return res.status(400).json({ message: "Already punched out today" });
      }

      const punchOut = new Date();
      const totalHours = ((punchOut.getTime() - existingAttendance.punchIn.getTime()) / (1000 * 60 * 60)).toFixed(2);

      const attendance = await dbStorage.updateAttendance(existingAttendance.id, {
        punchOut,
        totalHours
      });

      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to punch out" });
    }
  });

  // Payroll routes
  app.get("/api/payroll", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { employeeId, period } = req.query;
      const payroll = await dbStorage.getPayroll(employeeId as string, period as string);
      res.json(payroll);
    } catch (error) {
      res.status(500).json([]);
    }
  });

  app.post("/api/payroll/generate", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { period, employeeIds } = req.body;
      const results = [];

      for (const employeeId of employeeIds) {
        const employee = await dbStorage.getEmployee(employeeId);
        if (!employee) continue;

        // Calculate hours worked for the period
        const [year, month] = period.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        
        const attendanceRecords = await dbStorage.getAttendanceByPeriod(startDate, endDate);
        const employeeAttendance = attendanceRecords.filter(att => att.employeeId === employeeId);
        
        const totalHours = employeeAttendance.reduce((sum, att) => {
          return sum + (parseFloat(att.totalHours || "0"));
        }, 0);

        // Indian salary structure calculation
        const annualSalary = parseFloat(employee.salary || "0");
        const monthlySalary = annualSalary / 12;
        
        // Indian salary components
        const baseSalary = monthlySalary * 0.5; // 50% basic salary
        const hra = monthlySalary * 0.25; // 25% HRA
        const transportAllowance = Math.min(1600, monthlySalary * 0.1); // Transport allowance (max ₹1600)
        const medicalAllowance = Math.min(1250, monthlySalary * 0.05); // Medical allowance (max ₹1250)
        const otherAllowances = monthlySalary - baseSalary - hra - transportAllowance - medicalAllowance;
        
        // Indian deductions
        const providentFund = baseSalary * 0.12; // 12% of basic salary for PF
        const employeeStateInsurance = monthlySalary <= 21000 ? monthlySalary * 0.0075 : 0; // ESI 0.75% if salary ≤ ₹21,000
        const professionalTax = monthlySalary > 10000 ? 200 : 0; // Professional tax ₹200 if salary > ₹10,000
        // Calculate annual taxable income and TDS based on new tax regime
        const annualTaxableIncome = (baseSalary + otherAllowances) * 12; // Basic + Special Allowance
        let annualTax = 0;
        
        if (annualTaxableIncome > 1500000) {
          annualTax += (annualTaxableIncome - 1500000) * 0.3;
          annualTax += 300000 * 0.2;
          annualTax += 300000 * 0.15;
          annualTax += 300000 * 0.1;
          annualTax += 300000 * 0.05;
        } else if (annualTaxableIncome > 1200000) {
          annualTax += (annualTaxableIncome - 1200000) * 0.2;
          annualTax += 300000 * 0.15;
          annualTax += 300000 * 0.1;
          annualTax += 300000 * 0.05;
        } else if (annualTaxableIncome > 900000) {
          annualTax += (annualTaxableIncome - 900000) * 0.15;
          annualTax += 300000 * 0.1;
          annualTax += 300000 * 0.05;
        } else if (annualTaxableIncome > 600000) {
          annualTax += (annualTaxableIncome - 600000) * 0.1;
          annualTax += 300000 * 0.05;
        } else if (annualTaxableIncome > 300000) {
          annualTax += (annualTaxableIncome - 300000) * 0.05;
        }

        // Monthly TDS is annual tax divided by 12
        const incomeTax = annualTax / 12;
        const otherDeductions = 0;
        
        const grossPay = baseSalary + hra + transportAllowance + medicalAllowance + otherAllowances;
        const totalDeductions = providentFund + employeeStateInsurance + professionalTax + incomeTax + otherDeductions;
        const netPay = grossPay - totalDeductions;

        const payrollData = {
          employeeId,
          month: parseInt(month),
          year: parseInt(year),
          basicSalary: baseSalary.toString(),
          hra: hra.toString(),
          transportAllowance: transportAllowance.toString(),
          medicalAllowance: medicalAllowance.toString(),
          otherAllowances: otherAllowances.toString(),
          grossSalary: grossPay.toString(),
          providentFund: providentFund.toString(),
          esi: employeeStateInsurance.toString(),
          professionalTax: professionalTax.toString(),
          incomeTax: incomeTax.toString(),
          totalDeductions: totalDeductions.toString(),
          netSalary: netPay.toString(),
          status: "pending"
        };

        const payroll = await dbStorage.createPayroll(payrollData);
        results.push(payroll);
      }

      res.status(201).json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate payroll" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const employees = await dbStorage.getEmployees();
      const today = new Date();
      const todayStr = today.toDateString();
      
      // Get today's attendance data - for now using empty array as mock
      // In a real implementation, this would query the attendance table for today
      const todayAttendance: any[] = [];

      const presentToday = todayAttendance.filter((att: any) => att.status === 'present').length;
      const onLeave = employees.filter(emp => emp.status === 'inactive').length;
      
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const monthlyPayroll = await dbStorage.getPayrollByPeriod(currentMonth);
      const totalPayroll = monthlyPayroll.reduce((sum, pay) => sum + parseFloat(pay.netSalary), 0);

      res.json({
        totalEmployees: employees.length,
        presentToday,
        onLeave,
        payrollDue: totalPayroll,
        attendanceRate: employees.length > 0 ? ((presentToday / employees.length) * 100).toFixed(1) : 0
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
