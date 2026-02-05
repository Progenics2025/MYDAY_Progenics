import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./db-storage";
import { insertEmployeeSchema, insertAttendanceSchema, insertPayrollSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";
import crypto from 'crypto';
import { sendMail } from './lib/mailer';
import bcrypt from 'bcrypt';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Simple session middleware
const sessions = new Map<string, any>();

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  console.log('DEBUG authenticateToken token:', token);
  console.log('DEBUG authenticateToken hasToken:', token ? sessions.has(token) : false);
  console.log('DEBUG authenticateToken sessions size:', sessions.size);
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const sessionUser = sessions.get(token);
  console.log('DEBUG authenticateToken sessionUser:', sessionUser && sessionUser.id);
  req.user = sessionUser;
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

// Import route handlers
import expenseRoutes from './routes/expenses';
import leaveRoutes from './routes/leave';
import permissionRoutes from './routes/permission';
import reportRoutes from './routes/reports';
import documentsRoutes from './routes/documents';
import profileRoutes from './routes/profile';
import notifyRoutes from './routes/notify';
import holidaysRoutes from './routes/holidays';
import locationTrackerRoutes from './routes/location-tracker';

export async function registerRoutes(app: Express): Promise<Server> {
  // Register expense routes
  app.use('/api/expenses', authenticateToken, expenseRoutes);

  // Register leave routes
  app.use('/api/leave-requests', authenticateToken, leaveRoutes);

  // Register permission routes (2-hour monthly permission)
  app.use('/api/permission-requests', authenticateToken, permissionRoutes);

  // Register documents routes
  app.use('/api/documents', authenticateToken, documentsRoutes);

  // Register profile routes (employee profile CRUD)
  app.use('/api/profile', authenticateToken, profileRoutes);

  // Register report routes
  app.use('/api/reports', authenticateToken, reportRoutes);

  // Register notify routes. Leave creation is allowed without auth so internal calls from the server can post notifications.
  // Sensitive notify endpoints (approve/list/me) are protected inside the notify router itself.
  app.use('/api/notify', notifyRoutes);

  // Holidays routes
  app.use('/api/holidays', authenticateToken, holidaysRoutes);

  // Location tracking routes (field sales tracking)
  app.use('/api/location', authenticateToken, locationTrackerRoutes);

  // Health check endpoint (for Docker, load balancers, monitoring)
  app.get('/api/health', async (_req, res) => {
    try {
      // Basic health check - could add database ping here if needed
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      res.status(503).json({ status: 'unhealthy', error: 'Service unavailable' });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log('DEBUG /api/auth/login body:', req.body);
      const safe = loginSchema.safeParse(req.body);
      console.log('DEBUG loginSchema.safeParse:', safe);
      const { username, password } = loginSchema.parse(req.body);

      const user = await dbStorage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Compare provided password with stored password.
      // If stored password looks like a bcrypt hash (starts with $2), use bcrypt.compare.
      // Otherwise fall back to plain-text comparison (useful for in-memory dev storage).
      let passwordMatches = false;
      try {
        const stored = user.password as string;
        if (typeof stored === 'string' && stored.startsWith('$2')) {
          passwordMatches = await bcrypt.compare(password, stored);
        } else {
          passwordMatches = stored === password;
        }
      } catch (e) {
        console.error('Error comparing login password:', e);
        passwordMatches = false;
      }

      if (!passwordMatches) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const employee = await dbStorage.getEmployeeByUserId(user.id);
      const sessionId = generateSessionId();
      // store both user and employee in the session so handlers can use either
      sessions.set(sessionId, { ...user, employee });

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
      console.error('Error in /api/auth/login:', error);
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Forgot password: generate token and email/send link
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required' });

      const user = await dbStorage.getUserByUsername(email);
      if (!user) return res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });

      // generate token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
      await dbStorage.createPasswordResetToken(user.id, token, expiresAt);

      // Build frontend URL for the reset link. Preference order:
      // 1. Explicit FRONTEND_URL env var
      // 2. Request Origin header (useful when called from the browser)
      // 3. Construct from request protocol and host (best-effort)
      const reqOrigin = (req.headers.origin as string) || undefined;
      const frontendBase = (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim()) || reqOrigin || `${req.protocol}://${req.get('host')}` || 'http://localhost:5173';
      const resetUrl = `${frontendBase.replace(/\/$/, '')}/resetPassword?token=${token}`;

      try {
        const mailRes = await sendMail({
          to: email,
          subject: 'Password reset',
          text: `Reset password link: ${resetUrl}`,
          html: `<p>Click the link below to reset your password. This link expires in one hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
        });
        if (mailRes?.previewUrl) console.log('Password reset preview URL:', mailRes.previewUrl);
      } catch (e) {
        // If sendMail fails, still log the link for testing and advise configuring FRONTEND_URL
        console.error('sendMail failed, falling back to console log', e);
        console.log('Password reset link (fallback):', resetUrl);
        if (!process.env.FRONTEND_URL) {
          console.warn('Consider setting FRONTEND_URL to your public frontend URL so reset links point there instead of localhost.');
        }
      }

      res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (error) {
      console.error('Error in /api/auth/forgot-password:', error);
      res.status(500).json({ message: 'Failed to process forgot password' });
    }
  });

  // Reset password: validate token and update password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ message: 'Token and newPassword required' });

      const dbToken = await dbStorage.getValidResetToken(token);
      if (!dbToken) return res.status(400).json({ message: 'Invalid or expired token' });

      // update user password (hashing handled in storage)
      const updatedUser = await dbStorage.updateUserPassword(dbToken.user_id, newPassword);
      await dbStorage.markResetTokenUsed(dbToken.id);

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Error in /api/auth/reset-password:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Change password for authenticated user - requires current password
  app.post('/api/auth/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) return res.status(400).json({ message: 'currentPassword and newPassword are required' });
      if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });

      const user = await dbStorage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Determine if stored password is hashed (bcrypt) or plain string
      const stored = user.password as string;
      let matches = false;
      try {
        if (typeof stored === 'string' && stored.startsWith('$2')) {
          matches = await bcrypt.compare(currentPassword, stored);
        } else {
          matches = stored === currentPassword;
        }
      } catch (e) {
        console.error('Error comparing passwords:', e);
        matches = false;
      }

      if (!matches) return res.status(400).json({ message: 'Current password is incorrect' });

      // Update password using storage helper (which hashes for DB-backed storage)
      await dbStorage.updateUserPassword(user.id, newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error in /api/auth/change-password:', error);
      res.status(500).json({ message: 'Failed to change password' });
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

  // DEBUG: Admin-only endpoint to inspect stored password for a user and check a provided password.
  // WARNING: This endpoint is for local debugging only and should be removed in production.
  app.post('/api/debug/check-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { username, password } = req.body || {};
      if (!username) return res.status(400).json({ message: 'username required' });

      const user = await dbStorage.getUserByUsername(username);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const stored = user.password as string;
      let matches = false;
      try {
        if (typeof stored === 'string' && stored.startsWith('$2')) {
          matches = await bcrypt.compare(password || '', stored);
        } else {
          matches = stored === (password || '');
        }
      } catch (e) {
        console.error('Error comparing passwords in debug endpoint:', e);
      }

      res.json({ matches, stored });
    } catch (e) {
      console.error('Error in /api/debug/check-password:', e);
      res.status(500).json({ message: 'Failed' });
    }
  });

  // Employee routes
  app.get("/api/employees", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Only admins and managers can view all employees
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { search, department, role, status } = req.query;
      console.log('GET /api/employees - Query params:', { search, department, role, status });
      console.log('User:', req.user);

      if (search || department || role || status) {
        console.log('Searching employees with filters');
        const employees = await dbStorage.searchEmployees(
          search as string || "",
          {
            department: department as string,
            role: role as string,
            status: status as string
          }
        );
        // enrich with account role
        const enriched = await Promise.all(employees.map(async (e: any) => {
          const u = e.userId ? await dbStorage.getUser(e.userId) : null;
          return { ...e, accountRole: u?.role || 'employee' };
        }));
        console.log('Found employees:', enriched);
        res.json(enriched);
      } else {
        console.log('Getting all employees');
        const employees = await dbStorage.getEmployees();
        const enriched = await Promise.all(employees.map(async (e: any) => {
          const u = e.userId ? await dbStorage.getUser(e.userId) : null;
          return { ...e, accountRole: u?.role || 'employee' };
        }));
        console.log('Found employees:', enriched);
        res.json(enriched);
      }
    } catch (error) {
      console.error('Error in GET /api/employees:', error);
      res.status(500).json([]);
    }
  });

  app.get("/api/employees/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Employees can only view their own profile, admins/managers can view any
      const employee = await dbStorage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Check if user is trying to access their own profile or if they have admin/manager role
      const userEmployee = await dbStorage.getEmployeeByUserId(req.user.id);
      if (req.user.role === 'employee' && userEmployee?.id !== req.params.id) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const user = employee?.userId ? await dbStorage.getUser(employee.userId) : null;
      res.json({ ...employee, accountRole: user?.role || 'employee' });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", authenticateToken, upload.single('profilePhoto'), async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      console.log('POST /api/employees - Request body:', req.body);
      // When a profile photo is uploaded via multipart/form-data, fields will be in req.body as strings
      const rawBody: any = req.body || {};

      // parse skills if passed as comma-separated string
      if (rawBody.skills && typeof rawBody.skills === 'string') {
        try {
          rawBody.skills = JSON.parse(rawBody.skills);
        } catch (e) {
          rawBody.skills = rawBody.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const employeeData = insertEmployeeSchema.parse(rawBody);
      console.log('Parsed employee data:', employeeData);

      const { firstName, lastName, email } = employeeData;

      // Resolve or create a user for this employee
      console.log('Resolving user for email:', email);
      let newUser: any = undefined;
      // If the client supplied a userId, prefer resolving that first
      if ((rawBody as any).userId) {
        try {
          newUser = await dbStorage.getUser((rawBody as any).userId);
        } catch (e) {
          console.warn('Failed to lookup user by provided userId, falling back to email lookup', e);
        }
      }

      if (!newUser) {
        newUser = await dbStorage.getUserByUsername(email);
      }

      let initialPassword: string | undefined = undefined;
      if (!newUser) {
        console.log('No existing user found; creating new user...');
        // Generate a random password
        initialPassword = Math.random().toString(36).slice(-10) + "A1!";
        newUser = await dbStorage.createUser({
          id: randomUUID(),
          username: email, // Use email as username
          password: initialPassword,
          email,
          name: `${firstName} ${lastName}`,
          role: (rawBody.accountRole as string) || "employee",
        });
        console.log('Created new user:', newUser);
      } else {
        console.log('Using existing user:', newUser);
      }

      // Check if employee already exists with this employee ID
      const existingEmployee = await dbStorage.getEmployeeByUserId(newUser.id);
      if (existingEmployee) {
        return res.status(400).json({
          message: "Employee already exists for this user",
          employee: existingEmployee
        });
      }

      const processedData: any = {
        ...employeeData,
        userId: newUser.id, // Link to the new user
        joinDate: employeeData.joinDate ? new Date(employeeData.joinDate) : undefined,
        dateOfBirth: employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : undefined,
        gender: (employeeData as any).gender !== undefined ? (employeeData as any).gender : undefined,
      };

      // If frontend sends empty string for gender (no selection), don't persist empty string
      if (processedData.gender === '') {
        delete processedData.gender;
      }

      // handle uploaded profile photo
      if ((req as any).file) {
        processedData.profilePhotoUrl = `/uploads/${(req as any).file.filename}`;
      } else if (rawBody.profilePhotoUrl) {
        processedData.profilePhotoUrl = rawBody.profilePhotoUrl;
      }
      console.log('Processed employee data:', processedData);

      const employee = await dbStorage.createEmployee({
        ...processedData,
        id: randomUUID(),
      });
      console.log('Created employee:', employee);
      // include account role in response
      const accountUser = newUser || (await dbStorage.getUserByUsername(email));
      // If the authenticated user is admin and provided accountRole, ensure the user's role is updated/persisted
      try {
        // Allow admins and HR managers to set accountRole when creating an employee
        const isHrManager = req.user && req.user.role === 'manager' && (await dbStorage.getEmployeeByUserId(req.user.id))?.department === 'HR';
        if (req.user && (req.user.role === 'admin' || isHrManager) && rawBody.accountRole && accountUser && accountUser.id) {
          await dbStorage.updateUserRole(accountUser.id, rawBody.accountRole as string);
          accountUser.role = rawBody.accountRole as string;
        }
      } catch (e) {
        console.warn('Failed to update user role after creating employee:', e);
      }
      const resp: any = { employee, accountRole: accountUser?.role || 'employee' };
      if (initialPassword) resp.initialPassword = initialPassword;
      res.status(201).json(resp);
    } catch (error) {
      console.error('Error in POST /api/employees:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid employee data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create employee", error: (error as Error).message });
      }
    }
  });

  app.put("/api/employees/:id", authenticateToken, upload.single('profilePhoto'), async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // support multipart/form-data upload on update as well
      // if content-type is multipart, multer will have populated req.body and req.file
      const rawBody: any = req.body || {};
      if (rawBody.skills && typeof rawBody.skills === 'string') {
        try {
          rawBody.skills = JSON.parse(rawBody.skills);
        } catch (e) {
          rawBody.skills = rawBody.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const employeeData = insertEmployeeSchema.partial().parse(rawBody);

      // Convert date strings to Date objects if provided
      const processedData: any = {
        ...employeeData,
      };

      // joinDate & dateOfBirth: respect undefined (no change), null (clear), or non-empty -> Date
      if (Object.prototype.hasOwnProperty.call(employeeData, 'joinDate')) {
        if (employeeData.joinDate === null) processedData.joinDate = null;
        else if (employeeData.joinDate !== '' && employeeData.joinDate !== undefined) processedData.joinDate = new Date(employeeData.joinDate);
        else delete processedData.joinDate; // empty string -> treat as omitted
      }

      if (Object.prototype.hasOwnProperty.call(employeeData, 'dateOfBirth')) {
        if (employeeData.dateOfBirth === null) processedData.dateOfBirth = null;
        else if (employeeData.dateOfBirth !== '' && employeeData.dateOfBirth !== undefined) processedData.dateOfBirth = new Date(employeeData.dateOfBirth);
        else delete processedData.dateOfBirth;
      }

      // Remove keys that are explicitly undefined so we don't overwrite existing DB values with NULL
      Object.keys(processedData).forEach((k) => {
        if (processedData[k] === undefined) delete processedData[k];
      });

      // Avoid persisting empty-string gender which would overwrite DB defaults
      if (processedData.gender === '') delete processedData.gender;

      if ((req as any).file) {
        processedData.profilePhotoUrl = `/uploads/${(req as any).file.filename}`;
      } else if (rawBody.profilePhotoUrl) {
        processedData.profilePhotoUrl = rawBody.profilePhotoUrl;
      }
      // Never allow email to be updated via this endpoint once employee is created
      if (processedData.email) delete processedData.email;
      const employee = await dbStorage.updateEmployee(req.params.id, processedData);

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      // If admin supplied accountRole on update, persist to the linked user
      try {
        const isHrManager = req.user && req.user.role === 'manager' && (await dbStorage.getEmployeeByUserId(req.user.id))?.department === 'HR';
        if (req.user && (req.user.role === 'admin' || isHrManager) && rawBody.accountRole) {
          // find linked user for this employee
          const linkedUser = employee.userId ? await dbStorage.getUser(employee.userId) : null;
          if (linkedUser && linkedUser.id) {
            await dbStorage.updateUserRole(linkedUser.id, rawBody.accountRole as string);
            // reflect change in response
            (employee as any).accountRole = rawBody.accountRole;
          }
        }
      } catch (e) {
        console.warn('Failed to update user role during employee update:', e);
      }

      res.json(employee);
    } catch (error) {
      console.error('Error in PUT /api/employees/:id', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid employee data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update employee", error: (error as any).message, stack: (error as any).stack });
      }
    }
  });

  // Attendance report for admins and HR managers - returns JSON or CSV
  app.get('/api/attendance/report', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Only admins and HR managers can access full attendance report
      const isHrManager = req.user && req.user.role === 'manager' && (await dbStorage.getEmployeeByUserId(req.user.id))?.department === 'HR';
      if (!(req.user && (req.user.role === 'admin' || isHrManager))) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // optional query params: from, to, format (json|csv)
      const { from, to, format } = req.query;
      const fromDate = from ? new Date(from as string) : undefined;
      const toDate = to ? new Date(to as string) : undefined;

      // dbStorage should provide a method to fetch attendance by period; reuse existing helper
      // We'll fetch all attendance records in period and return detailed rows
      // Add a helper in PostgresStorage if heavy queries are needed; for now, query per-employee range
      let rows: any[] = [];
      if (typeof (dbStorage as any).getAttendanceByPeriod === 'function' && fromDate && toDate) {
        rows = await (dbStorage as any).getAttendanceByPeriod(fromDate, toDate);
      }

      // If dbStorage doesn't implement getAttendanceByPeriod, fallback to fetching all employees and their recent attendance
      let records = rows;
      if (!rows || rows.length === 0) {
        // attempt per-employee fetch
        const employees = await dbStorage.getEmployees();
        const recs: any[] = [];
        for (const emp of employees) {
          const atts = await dbStorage.getAttendance(emp.employeeId || emp.id, 'current');
          if (atts) {
            if (Array.isArray(atts)) recs.push(...atts);
            else recs.push(atts);
          }
        }
        records = recs;
      }

      // Normalize records to include employee info and timestamps
      const normalized = await Promise.all(records.map(async (r: any) => {
        const emp = await dbStorage.getEmployeeByEmployeeId ? await dbStorage.getEmployeeByEmployeeId(r.employeeId) : await dbStorage.getEmployee(r.employeeId);
        return {
          employeeId: r.employeeId,
          employeeDbId: r.employeeId || (emp && emp.id),
          employeeName: emp ? `${emp.firstName} ${emp.lastName}`.trim() : undefined,
          punchIn: r.punchIn || r.date || null,
          punchOut: r.punchOut || null,
          totalHours: r.totalHours || null,
          createdAt: r.createdAt || null,
        };
      }));

      const outFormat = (format as string || 'json').toLowerCase();
      if (outFormat === 'csv') {
        // simple CSV conversion
        const header = ['employeeId', 'employeeName', 'punchIn', 'punchOut', 'totalHours', 'createdAt'];
        const lines = [header.join(',')];
        for (const r of normalized) {
          const line = [r.employeeId, `"${(r.employeeName || '')}"`, r.punchIn ? new Date(r.punchIn).toISOString() : '', r.punchOut ? new Date(r.punchOut).toISOString() : '', r.totalHours || '', r.createdAt ? new Date(r.createdAt).toISOString() : ''];
          lines.push(line.join(','));
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
        return res.send(lines.join('\n'));
      }

      res.json(normalized);
    } catch (e) {
      console.error('Error generating attendance report:', e);
      res.status(500).json({ message: 'Failed to generate report' });
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

  // Leave balances: anyone authenticated can GET their own balances; admin/hr can GET any and update
  app.get('/api/leave-balances/:employeeId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { employeeId } = req.params;
      // employees can fetch only their own balances
      const userEmp = await dbStorage.getEmployeeByUserId(req.user.id);
      if (req.user.role === 'employee' && userEmp?.employeeId !== employeeId && userEmp?.id !== employeeId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const balances = await dbStorage.getLeaveBalances(employeeId);
      if (!balances) return res.status(404).json({ message: 'Employee not found' });
      res.json(balances);
    } catch (e) {
      console.error('Error GET /api/leave-balances/:employeeId', e);
      res.status(500).json({ message: 'Failed to fetch leave balances' });
    }
  });

  app.put('/api/leave-balances/:employeeId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('PUT /api/leave-balances body:', req.body);
      const { employeeId } = req.params;
      // only admin and HR (including HR managers) can update leave balances
      const isHrManager = req.user.role === 'manager' && (await dbStorage.getEmployeeByUserId(req.user.id))?.department === 'HR';
      if (!(req.user.role === 'admin' || req.user.role === 'hr' || isHrManager)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const { casualLeave, sickLeave, earnedLeave } = req.body || {};
      const updated = await dbStorage.updateLeaveBalances(employeeId, { casualLeave, sickLeave, earnedLeave });
      if (!updated) return res.status(404).json({ message: 'Employee not found' });
      res.json(updated);
    } catch (e) {
      console.error('Error PUT /api/leave-balances/:employeeId', e);
      // Surface validation errors as 400 so clients can show precise messages
      const msg = (e && (e as any).message) ? (e as any).message : 'Failed to update leave balances';
      if (msg && msg.toLowerCase().includes('invalid')) {
        return res.status(400).json({ message: msg });
      }
      res.status(500).json({ message: msg });
    }
  });

  // Attendance routes
  app.get("/api/attendance", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { employeeId, date } = req.query;

      // Get user's employee profile
      const userEmployee = await dbStorage.getEmployeeByUserId(req.user.id);

      // Employees can only view their own attendance, admins/managers can view any
      let targetEmployeeId = employeeId as string;
      if (req.user.role === 'employee') {
        if (!userEmployee) {
          return res.status(404).json({ message: "Employee profile not found" });
        }
        targetEmployeeId = userEmployee.employeeId; // Force to their own ID
      } else {
        targetEmployeeId = employeeId as string || (userEmployee?.employeeId || '');
      }

      const targetDate = date ? new Date(date as string) : undefined;

      const attendance = await dbStorage.getAttendance(targetEmployeeId, targetDate ? 'current' : undefined);

      // Enrich attendance records with GPS location addresses
      const enrichedAttendance = await Promise.all(attendance.map(async (record: any) => {
        try {
          const gpsLocations = await dbStorage.getGPSLocations(record.id);
          if (gpsLocations && gpsLocations.length > 0) {
            const punchInLocation = gpsLocations[0];
            const punchOutLocation = gpsLocations.length > 1 ? gpsLocations[gpsLocations.length - 1] : null;
            return {
              ...record,
              punchInAddress: punchInLocation?.address || null,
              punchOutAddress: punchOutLocation?.address || null,
            };
          }
        } catch (err) {
          // silently fail and return record without addresses
        }
        return record;
      }));

      res.json(enrichedAttendance);
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

      const { latitude, longitude, accuracy } = req.body;

      const today = new Date();
      // Allow multiple punch-in/out per day: fetch latest record and only prevent punch-in
      // if the latest record for today is still open (no punchOut)
      const existingAttendance = await dbStorage.getTodayAttendance(employee.employeeId);
      if (existingAttendance && !existingAttendance.punchOut) {
        return res.status(400).json({ message: "Already punched in and not punched out yet" });
      }

      const attendanceData = {
        employeeId: employee.employeeId,
        date: today,
        punchIn: today,
        punchOut: null,
        status: "present",
        totalHours: null
      };

      const attendance = await dbStorage.createAttendance({
        ...attendanceData,
        id: randomUUID(),
      });

      // Save GPS location if coordinates provided
      if (latitude && longitude) {
        let address: string | null = null;
        try {
          // Fetch address using reverse geocoding
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'MyDay-HRMS/1.0' } }
          );
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            const addr = geoData.address;
            if (addr) {
              const parts = [];
              if (addr.building) parts.push(addr.building);
              if (addr.road) parts.push(addr.road);
              if (addr.suburb) parts.push(addr.suburb);
              if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
              address = parts.length > 0 ? parts.join(', ') : geoData.display_name || null;
            } else {
              address = geoData.display_name || null;
            }
          }
        } catch (geoErr) {
          console.error('Geocoding failed:', geoErr);
        }

        await dbStorage.createGPSLocation({
          attendanceId: attendance.id,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: accuracy ? parseFloat(accuracy) : null,
          address,
          timestamp: today,
        });
      }

      res.status(201).json(attendance);
    } catch (error) {
      console.error('Punch in error:', error);
      res.status(500).json({ message: "Failed to punch in" });
    }
  });

  app.post("/api/attendance/punch-out", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const employee = await dbStorage.getEmployeeByUserId(req.user.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee profile not found" });
      }

      const { latitude, longitude, accuracy } = req.body;

      // For punch-out, find the latest open attendance for today and close it
      const existingAttendance = await dbStorage.getTodayAttendance(employee.employeeId);
      if (!existingAttendance || !existingAttendance.punchIn) {
        return res.status(400).json({ message: "Must punch in first" });
      }

      if (existingAttendance.punchOut) {
        return res.status(400).json({ message: "No open punch-in found to punch out" });
      }

      const punchOut = new Date();
      const totalHours = ((punchOut.getTime() - existingAttendance.punchIn.getTime()) / (1000 * 60 * 60)).toFixed(2);

      const attendance = await dbStorage.updateAttendance(existingAttendance.id, {
        punchOut,
        totalHours
      });

      // Save GPS location if coordinates provided
      if (latitude && longitude) {
        let address: string | null = null;
        try {
          // Fetch address using reverse geocoding
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'MyDay-HRMS/1.0' } }
          );
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            const addr = geoData.address;
            if (addr) {
              const parts = [];
              if (addr.building) parts.push(addr.building);
              if (addr.road) parts.push(addr.road);
              if (addr.suburb) parts.push(addr.suburb);
              if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
              address = parts.length > 0 ? parts.join(', ') : geoData.display_name || null;
            } else {
              address = geoData.display_name || null;
            }
          }
        } catch (geoErr) {
          console.error('Geocoding failed:', geoErr);
        }

        await dbStorage.createGPSLocation({
          attendanceId: existingAttendance.id,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: accuracy ? parseFloat(accuracy) : null,
          address,
          timestamp: punchOut,
        });
      }

      res.json(attendance);
    } catch (error) {
      console.error('Punch out error:', error);
      res.status(500).json({ message: "Failed to punch out" });
    }
  });

  // Debug: get all attendance records for today for an employee
  app.get('/api/attendance/today-all/:employeeId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { employeeId } = req.params;
      // restrict employees to their own records
      if (req.user.role === 'employee') {
        const userEmployee = await dbStorage.getEmployeeByUserId(req.user.id);
        if (!userEmployee || userEmployee.employeeId !== employeeId) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const records = await dbStorage.getAttendanceByPeriod(today, tomorrow);
      const filtered = records.filter((r: any) => r.employeeId === employeeId);
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch today attendance records', error });
    }
  });

  // Payroll routes
  app.get("/api/payroll", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { employeeId, period } = req.query;
      console.log('GET /api/payroll - Query params:', { employeeId, period });

      // Get user's employee profile
      const userEmployee = await dbStorage.getEmployeeByUserId(req.user.id);

      // Employees can only view their own payroll, admins/managers can view any
      let targetEmployeeId = employeeId as string;
      if (req.user.role === 'employee') {
        if (!userEmployee) {
          return res.status(404).json({ message: "Employee profile not found" });
        }
        targetEmployeeId = userEmployee.employeeId; // Force to their own ID
      }

      const payroll = await dbStorage.getPayroll(targetEmployeeId, period as string);
      console.log('Payroll result:', payroll);
      res.json(payroll);
    } catch (error) {
      console.error('Error in GET /api/payroll:', error);
      res.status(500).json([]);
    }
  });

  app.put("/api/payroll/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { id } = req.params;
      const data = req.body;

      // Filter out fields that are not in the payroll schema to avoid DB errors
      // Note: city, state, and day counts (totalDays, etc.) are not currently in the DB schema
      // so they won't be persisted, but salary components will be.
      const validFields = [
        'basicSalary', 'hra', 'transportAllowance', 'medicalAllowance', 'otherAllowances',
        'grossSalary', 'providentFund', 'esi', 'professionalTax', 'incomeTax',
        'totalDeductions', 'netSalary', 'status', 'paymentDate', 'month', 'year',
        'city', 'state', 'totalDays', 'daysPaid', 'arrearDays', 'absentDays', 'lop'
      ];

      const updateData: any = {};
      for (const field of validFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }

      const updated = await dbStorage.updatePayroll(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error('Error updating payroll:', error);
      res.status(500).json({ message: "Failed to update payroll" });
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

        const payroll = await dbStorage.createPayroll({
          ...payrollData,
          id: randomUUID(),
        });
        results.push(payroll);
      }

      res.status(201).json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate payroll" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Only admins and managers can view full dashboard stats
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        // For employees, return limited stats
        const userEmployee = await dbStorage.getEmployeeByUserId(req.user.id);
        if (!userEmployee) {
          // Return safe default stats for users without an employee record
          return res.json({
            totalEmployees: 0,
            presentToday: 0,
            onLeave: 0,
            payrollDue: 0,
            attendanceRate: 0
          });
        }

        const todayAttendance = await dbStorage.getTodayAttendance(userEmployee.employeeId);
        const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const userPayroll = await dbStorage.getPayroll(userEmployee.employeeId, currentMonth);
        const totalPayroll = userPayroll.reduce((sum, pay) => sum + parseFloat(pay.netSalary), 0);

        return res.json({
          totalEmployees: 1, // Only show their own count
          presentToday: todayAttendance ? 1 : 0,
          onLeave: 0,
          payrollDue: totalPayroll,
          attendanceRate: todayAttendance ? 100 : 0
        });
      }

      const employees = await dbStorage.getEmployees();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's attendance
      // We can use getAttendanceByPeriod for today's range
      let todayAttendance: any[] = [];
      if (typeof (dbStorage as any).getAttendanceByPeriod === 'function') {
        todayAttendance = await (dbStorage as any).getAttendanceByPeriod(today, tomorrow);
      }

      // Count unique employees present today
      const presentEmployeeIds = new Set(todayAttendance.map((a: any) => a.employeeId));
      const presentToday = presentEmployeeIds.size;

      // Calculate On Leave
      // Fetch all approved leave requests
      // Ideally we should have a method to get active leaves for a date, but we can filter recent ones
      const allLeaves = await dbStorage.getAllLeaveRequests();
      const onLeaveCount = allLeaves.filter((leave: any) => {
        if (leave.status !== 'approved') return false;
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return today >= start && today <= end;
      }).length;

      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const monthlyPayroll = await dbStorage.getPayrollByPeriod(currentMonth);
      const totalPayroll = monthlyPayroll.reduce((sum, pay) => sum + parseFloat(pay.netSalary), 0);

      res.json({
        totalEmployees: employees.length,
        presentToday,
        onLeave: onLeaveCount,
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
