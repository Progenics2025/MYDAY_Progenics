import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import {
  type User, type NewUser,
  type Employee, type NewEmployee,
  type Attendance, type NewAttendance,
  type Payroll, type NewPayroll,
  type LeaveRequest, type NewLeaveRequest
} from "@shared/schema";
import {
  users, employees, attendance, payroll, leaveRequests, expenses, documents
} from "@shared/schema";
import { eq, and, like, or, gte, lte, lt, desc } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export class PostgresStorage {
  private pool: Pool;
  private db: any;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'paypulse_user',
      password: process.env.DB_PASSWORD || 'Prolab#05',
      database: process.env.DB_NAME || 'paypulsepro'
    });
    this.db = drizzle(this.pool);
  }

  // Employee operations


  // Attendance operations
  async getAttendance(employeeId: string, month?: string): Promise<Attendance[]> {
    let startDate, endDate;

    if (month === 'current') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (month === 'last') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const result = await this.db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employeeId),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        )
      )
      .orderBy(desc(attendance.date));

    return result;
  }

  async getAttendanceByPeriod(startDate: Date, endDate: Date): Promise<Attendance[]> {
    const result = await this.db
      .select()
      .from(attendance)
      .where(
        and(
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        )
      )
      .orderBy(desc(attendance.date));
    return result;
  }

  async getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]> {
    return this.getAttendanceByPeriod(startDate, endDate);
  }

  async getPayrollByDateRange(startDate: Date, endDate: Date): Promise<Payroll[]> {
    const result = await this.db
      .select()
      .from(payroll)
      .where(
        and(
          gte(payroll.paymentDate, startDate),
          lte(payroll.paymentDate, endDate)
        )
      )
      .orderBy(desc(payroll.paymentDate));
    return result;
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
    const employeesList = await this.getEmployees();
    const attendanceList = await this.getAttendanceByDateRange(startDate, endDate);

    // Group employees by department
    const deptMap = employeesList.reduce((acc: any, emp) => {
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
    }, {});

    // Calculate attendance stats for each department
    attendanceList.forEach(record => {
      const emp = employeesList.find(e => e.employeeId === record.employeeId);
      if (!emp || !record.status) return;

      const dept = emp.department || 'Unassigned';
      if (!deptMap[dept]) return;

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
    return Object.values(deptMap).map((stats: any) => ({
      ...stats,
      attendanceRate: stats.total > 0 ? (stats.present / stats.total * 100).toFixed(1) : '0',
      averageHours: stats.total > 0 ? (stats.totalHours / stats.total).toFixed(1) : '0'
    }));
  }

  async getTodayAttendance(employeeId: string): Promise<Attendance | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employeeId),
          gte(attendance.date, today),
          lt(attendance.date, tomorrow)
        )
      )
      .orderBy(desc(attendance.createdAt));

    return result[0];
  }
  async createAttendance(data: NewAttendance): Promise<Attendance> {
    const result = await this.db
      .insert(attendance)
      .values({
        ...data,
        id: randomUUID(),
        date: new Date()
      })
      .returning();

    return result[0];
  }

  async updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance | undefined> {
    const result = await this.db
      .update(attendance)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(attendance.id, id))
      .returning();

    return result[0];
  }

  // Leave Request operations
  async createLeaveRequest(data: {
    employeeId: string;
    startDate: Date;
    endDate: Date;
    leaveType: string;
    reason: string;
    totalDays: number;
    status: string;
    documentUrl?: string | null;
    documentBlob?: string | null;
  }): Promise<any> {
    const now = new Date();
    // resolve employee display name if available
    let employeeName: string | null = null;
    try {
      // data.employeeId may be a userId or an employeeId; try both
      let emp = await this.getEmployeeByUserId(data.employeeId);
      if (!emp) emp = await this.getEmployeeByEmployeeId(data.employeeId);
      if (emp) {
        employeeName = `${emp.firstName} ${emp.lastName}`.trim();
      }
    } catch (e) {
      // ignore lookup errors
    }

    const result = await this.db
      .insert(leaveRequests)
      .values({
        id: randomUUID(),
        ...data,
        employeeName: employeeName,
        startDate: data.startDate,
        endDate: data.endDate,
        documentUrl: (data as any).documentUrl || null,
        documentBlob: (data as any).documentBlob || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result[0];
  }

  async getLeaveRequests(employeeId: string): Promise<any[]> {
    const result = await this.db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.employeeId, employeeId))
      .orderBy(desc(leaveRequests.createdAt));

    return result;
  }

  // Paginated leave requests for a given employeeId with optional filters
  async getLeaveRequestsPaged(employeeId: string, page = 1, pageSize = 10, filters: { status?: string; q?: string } = {}): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const whereClauses: string[] = [];
    const values: any[] = [];
    // employeeId stored as employee.employeeId strings in leaveRequests
    whereClauses.push(`employee_id = $${values.length + 1}`);
    values.push(employeeId);

    if (filters.status) {
      whereClauses.push(`status = $${values.length + 1}`);
      values.push(filters.status);
    }

    if (filters.q) {
      whereClauses.push(`(lower(reason) LIKE $${values.length + 1} OR lower(leave_type) LIKE $${values.length + 2})`);
      values.push(`%${filters.q.toLowerCase()}%`);
      values.push(`%${filters.q.toLowerCase()}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(*) AS total FROM leave_requests ${whereSql}`;
    const countRes = await this.pool.query(countSql, values);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const itemsSql = `SELECT * FROM leave_requests ${whereSql} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const itemsVals = values.concat([pageSize, offset]);
    const itemsRes = await this.pool.query(itemsSql, itemsVals);

    return { items: itemsRes.rows, total, page, pageSize };
  }

  // Paginated all leave requests (admin/manager) with optional filters
  async getAllLeaveRequestsPaged(page = 1, pageSize = 10, filters: { status?: string; q?: string; employeeId?: string } = {}): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const whereClauses: string[] = [];
    const values: any[] = [];

    if (filters.employeeId) {
      whereClauses.push(`employee_id = $${values.length + 1}`);
      values.push(filters.employeeId);
    }

    if (filters.status) {
      whereClauses.push(`status = $${values.length + 1}`);
      values.push(filters.status);
    }

    if (filters.q) {
      whereClauses.push(`(lower(reason) LIKE $${values.length + 1} OR lower(leave_type) LIKE $${values.length + 2} OR lower(employee_name) LIKE $${values.length + 3})`);
      values.push(`%${filters.q.toLowerCase()}%`);
      values.push(`%${filters.q.toLowerCase()}%`);
      values.push(`%${filters.q.toLowerCase()}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(*) AS total FROM leave_requests ${whereSql}`;
    const countRes = await this.pool.query(countSql, values);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const itemsSql = `SELECT * FROM leave_requests ${whereSql} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const itemsVals = values.concat([pageSize, offset]);
    const itemsRes = await this.pool.query(itemsSql, itemsVals);

    return { items: itemsRes.rows, total, page, pageSize };
  }

  // Return all leave requests (manager/admin view)
  async getAllLeaveRequests(): Promise<any[]> {
    const result = await this.db
      .select()
      .from(leaveRequests)
      .orderBy(desc(leaveRequests.createdAt));

    return result;
  }

  async getLeaveRequestById(id: string): Promise<any | undefined> {
    const result = await this.db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id));
    return result[0];
  }

  async updateLeaveRequestStatus(
    id: string,
    status: string,
    approvedBy?: string
  ): Promise<any> {
    // Use a DB transaction to update the leave request and, when approving,
    // deduct the appropriate leave balance from the employee atomically.
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the leave request row for update
      const lrRes = await client.query('SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE', [id]);
      if (!lrRes || lrRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return undefined;
      }
      const existing = lrRes.rows[0];

      const now = new Date().toISOString();
      console.log(`[UPDATE_STATUS] Leave request ${id}, transitioning from ${existing.status} to ${status}`);

      // If transitioning to approved and it wasn't already approved, deduct leave
      if (status === 'approved' && existing.status !== 'approved') {
        const leaveType = existing.leave_type || existing.leaveType;
        const totalDaysRaw = existing.total_days || existing.totalDays || 0;
        // total_days can be decimal (e.g. 0.5 for half-day). Deduct the exact number requested
        // rather than rounding up; ensure it's a number and non-negative.
        const toDeduct = Number(totalDaysRaw) || 0;

        if (toDeduct > 0) {
          // Lock employee row (by employee_id) and deduct from correct column
          const empId = existing.employee_id || existing.employeeId;
          // Ensure we don't go negative: use GREATEST
          let updateSql = '';
          let params: any[] = [];
          if (leaveType === 'casual' || leaveType === 'casual_leave' || leaveType === 'CL') {
            updateSql = `UPDATE employees SET casual_leave = GREATEST(0, casual_leave - $1), updated_at = $2 WHERE employee_id = $3 OR id = $3 RETURNING *`;
            params = [toDeduct, now, empId];
          } else if (leaveType === 'sick' || leaveType === 'sick_leave' || leaveType === 'SL') {
            updateSql = `UPDATE employees SET sick_leave = GREATEST(0, sick_leave - $1), updated_at = $2 WHERE employee_id = $3 OR id = $3 RETURNING *`;
            params = [toDeduct, now, empId];
          } else if (leaveType === 'earned' || leaveType === 'earned_leave' || leaveType === 'EL') {
            updateSql = `UPDATE employees SET earned_leave = GREATEST(0, earned_leave - $1), updated_at = $2 WHERE employee_id = $3 OR id = $3 RETURNING *`;
            params = [toDeduct, now, empId];
          }

          if (updateSql) {
            const empUpdateRes = await client.query(updateSql, params);
            console.log(`[UPDATE_STATUS] Deducted ${toDeduct} days of ${leaveType} from employee ${empId}`);
          }
        }
      } else if (status === 'rejected') {
        console.log(`[UPDATE_STATUS] Leave request rejected - NO leave balance deducted`);
      }

      // Update leave_requests row
      const updSql = `UPDATE leave_requests SET status = $1, approved_by = $2, approved_at = $3, updated_at = $4 WHERE id = $5 RETURNING *`;
      const updVals = [status, approvedBy || null, status === 'approved' ? now : null, now, id];
      const updRes = await client.query(updSql, updVals);

      await client.query('COMMIT');
      console.log(`[UPDATE_STATUS] Leave request ${id} status updated to ${status}`);
      return updRes.rows[0];
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) { }
      console.error('[UPDATE_STATUS] Error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // Notification operations (use raw SQL via pool to avoid Drizzle column typing)
  async createNotification(data: {
    notificationType: string;
    referenceId: string; // typically leave request id
    managerId?: string | null;
    employeeId?: string | null;
    payload?: any;
  }): Promise<any> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const payload = data.payload ? JSON.stringify(data.payload) : null;

    const sql = `INSERT INTO notifications (id, notification_type, reference_id, manager_id, employee_id, payload, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;

    const values = [
      id,
      data.notificationType,
      data.referenceId,
      data.managerId || null,
      data.employeeId || null,
      payload,
      'pending',
      now,
      now,
    ];

    const result = await this.pool.query(sql, values);
    return result.rows[0];
  }

  async getNotificationsForUser(userId: string): Promise<any[]> {
    const sql = `SELECT * FROM notifications WHERE manager_id = $1 OR employee_id = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(sql, [userId]);
    return result.rows;
  }

  async getNotificationById(id: string): Promise<any | undefined> {
    const sql = `SELECT * FROM notifications WHERE id = $1`;
    const result = await this.pool.query(sql, [id]);
    return result.rows[0];
  }

  async approveNotification(id: string, approvedBy: string): Promise<any> {
    const sql = `UPDATE notifications SET status = $1, approved_by = $2, approved_at = NOW(), updated_at = NOW() WHERE id = $3 RETURNING *`;
    const result = await this.pool.query(sql, ['approved', approvedBy, id]);
    return result.rows[0];
  }

  async rejectNotification(id: string, rejectedBy: string, reason?: string): Promise<any> {
    // Handle null payload by initializing it if needed, then set rejection reason
    const sql = `UPDATE notifications 
      SET status = $1, 
          approved_by = $2, 
          approved_at = NOW(), 
          payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object('rejectionReason', $3),
          updated_at = NOW() 
      WHERE id = $4 
      RETURNING *`;
    const result = await this.pool.query(sql, ['rejected', rejectedBy, reason || '', id]);
    return result.rows[0];
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: NewUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  // Password reset token helpers
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    const sql = `INSERT INTO password_reset_tokens (user_id, token, created_at, expires_at, used) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const vals = [userId, token, new Date().toISOString(), expiresAt.toISOString(), false];
    const res = await this.pool.query(sql, vals);
    return res.rows[0];
  }

  async getValidResetToken(token: string) {
    const sql = `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW() LIMIT 1`;
    const res = await this.pool.query(sql, [token]);
    return res.rows[0];
  }

  async markResetTokenUsed(id: string) {
    const sql = `UPDATE password_reset_tokens SET used = true, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const res = await this.pool.query(sql, [id]);
    return res.rows[0];
  }

  async updateUserPassword(userId: string, newPasswordPlain: string) {
    const saltRounds = parseInt(process.env.NO_OF_SALT_ROUNDS || '10', 10);
    const hashed = await bcrypt.hash(newPasswordPlain, saltRounds);
    const sql = `UPDATE users SET password = $1, must_reset_password = false, updated_at = NOW() WHERE id = $2 RETURNING *`;
    const res = await this.pool.query(sql, [hashed, userId]);
    return res.rows[0];
  }

  async updateUserRole(userId: string, role: string) {
    const sql = `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
    const res = await this.pool.query(sql, [role, userId]);
    return res.rows[0];
  }

  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    const result = await this.db.select().from(employees);
    console.log('DB getEmployees result:', result);
    return result;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const result = await this.db.select().from(employees).where(eq(employees.id, id));
    return result[0];
  }

  async getEmployeeByUserId(userId: string): Promise<Employee | undefined> {
    const result = await this.db.select().from(employees).where(eq(employees.userId, userId));
    return result[0];
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const result = await this.db.select().from(employees).where(eq(employees.employeeId, employeeId));
    return result[0];
  }

  async createEmployee(employee: NewEmployee): Promise<Employee> {
    const result = await this.db.insert(employees).values(employee).returning();
    return result[0];
  }

  async getLeaveBalances(employeeId: string): Promise<{ casualLeave: number; sickLeave: number; earnedLeave: number } | undefined> {
    // Try to find by employeeId (employee.employeeId) first, then by primary id
    const res = await this.db.select().from(employees).where(eq(employees.employeeId, employeeId)).limit(1);
    let row = res[0];
    if (!row) {
      const res2 = await this.db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      row = res2[0];
    }
    if (!row) return undefined;

    // Drizzle/pg may return decimals as strings; coerce to numbers and provide defaults
    // Check both camelCase and snake_case formats for compatibility
    const casual = ((row as any).casual_leave !== undefined && (row as any).casual_leave !== null)
      ? Number((row as any).casual_leave)
      : ((row as any).casualLeave !== undefined && (row as any).casualLeave !== null)
        ? Number((row as any).casualLeave)
        : 12;
    const sick = ((row as any).sick_leave !== undefined && (row as any).sick_leave !== null)
      ? Number((row as any).sick_leave)
      : ((row as any).sickLeave !== undefined && (row as any).sickLeave !== null)
        ? Number((row as any).sickLeave)
        : 12;
    const earned = ((row as any).earned_leave !== undefined && (row as any).earned_leave !== null)
      ? Number((row as any).earned_leave)
      : ((row as any).earnedLeave !== undefined && (row as any).earnedLeave !== null)
        ? Number((row as any).earnedLeave)
        : 15;

    return {
      casualLeave: casual,
      sickLeave: sick,
      earnedLeave: earned,
    };
  }

  async updateLeaveBalances(employeeId: string, balances: { casualLeave?: number; sickLeave?: number; earnedLeave?: number }): Promise<any> {
    try {
      const clauses: string[] = [];
      const vals: any[] = [];
      let idx = 1;

      if (balances.casualLeave !== undefined) {
        const v = Number(balances.casualLeave);
        if (Number.isNaN(v) || v < 0) throw new Error('Invalid casualLeave value');
        clauses.push(`casual_leave = $${idx++}`);
        vals.push(v);
      }
      if (balances.sickLeave !== undefined) {
        const v = Number(balances.sickLeave);
        if (Number.isNaN(v) || v < 0) throw new Error('Invalid sickLeave value');
        clauses.push(`sick_leave = $${idx++}`);
        vals.push(v);
      }
      if (balances.earnedLeave !== undefined) {
        const v = Number(balances.earnedLeave);
        if (Number.isNaN(v) || v < 0) throw new Error('Invalid earnedLeave value');
        clauses.push(`earned_leave = $${idx++}`);
        vals.push(v);
      }

      if (clauses.length === 0) return null;

      const sql = `UPDATE employees SET ${clauses.join(', ')}, updated_at = NOW() WHERE employee_id = $${idx} OR id = $${idx} RETURNING *`;
      vals.push(employeeId);
      console.log('updateLeaveBalances SQL:', sql, 'vals:', vals);

      const res = await this.pool.query(sql, vals);
      return res.rows[0];
    } catch (e) {
      console.error('Error updateLeaveBalances', e);
      throw e;
    }
  }

  async updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    // If email is being updated and employee is linked to a user, update the users table as well
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch existing employee
      const empRes = await client.query('SELECT * FROM employees WHERE id = $1 FOR UPDATE', [id]);
      if (!empRes || empRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return undefined;
      }
      const existing = empRes.rows[0];

      // If email changed and user_id present, attempt to update users.email and users.username
      if (employeeData.email && existing.email !== employeeData.email && existing.user_id) {
        try {
          const now = new Date().toISOString();
          const updateUserSql = `UPDATE users SET email = $1, username = $1, updated_at = $2 WHERE id = $3 RETURNING *`;
          await client.query(updateUserSql, [employeeData.email, now, existing.user_id]);
        } catch (e: any) {
          // If updating users fails (e.g. unique constraint), rollback and rethrow so caller can handle
          await client.query('ROLLBACK');
          throw e;
        }
      }

      // Update employees
      const keys = Object.keys(employeeData || {});
      if (keys.length === 0) {
        await client.query('COMMIT');
        // return fresh row
        const fresh = await this.db.select().from(employees).where(eq(employees.id, id));
        return fresh[0];
      }

      // convert camelCase JS keys to snake_case DB column names
      const camelToSnake = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase();

      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      for (const k of keys) {
        const rawVal = (employeeData as any)[k];
        // serialize certain types: Date -> ISO string, arrays/objects -> JSON
        let val = rawVal;
        if (val instanceof Date) {
          val = val.toISOString();
        } else if (Array.isArray(val) || (val && typeof val === 'object')) {
          try { val = JSON.stringify(val); } catch (e) { /* fall through */ }
        }

        const col = camelToSnake(k);
        sets.push(`${col} = $${idx++}`);
        vals.push(val);
      }

      // add updated_at
      sets.push(`updated_at = $${idx++}`);
      vals.push(new Date().toISOString());

      // add WHERE id param
      const whereIdx = idx++;
      vals.push(id);

      const sql = `UPDATE employees SET ${sets.join(', ')} WHERE id = $${whereIdx} RETURNING *`;
      await client.query(sql, vals);

      await client.query('COMMIT');
      // Return a Drizzle-mapped row so keys match other read paths (camelCase)
      const fresh = await this.db.select().from(employees).where(eq(employees.id, id));
      return fresh[0];
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) { }
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    // Use raw SQL with RETURNING to get an accurate row count across different Drizzle versions
    const sql = `DELETE FROM employees WHERE id = $1 RETURNING *`;
    const res = await this.pool.query(sql, [id]);
    return (res && Number(res.rowCount || 0) > 0);
  }

  // Holidays operations
  async getHolidays(year?: number): Promise<any[]> {
    let sql = 'SELECT * FROM holidays WHERE is_deleted = false';
    const vals: any[] = [];
    if (year) {
      sql += ` AND EXTRACT(YEAR FROM date) = $${vals.length + 1}`;
      vals.push(year);
    }
    sql += ' ORDER BY date ASC';
    const res = await this.pool.query(sql, vals);
    return res.rows;
  }

  async createHoliday(data: { name: string; date: Date; type?: string; appliesTo?: string; iconUrl?: string }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const sql = `INSERT INTO holidays (id, name, date, type, applies_to, icon_url, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    const vals = [id, data.name, data.date.toISOString().slice(0, 10), data.type || 'Mandatory', data.appliesTo || 'All', data.iconUrl || null, now, now];
    const res = await this.pool.query(sql, vals);
    return res.rows[0];
  }

  async updateHoliday(id: string, data: { name?: string; date?: Date; type?: string; appliesTo?: string; iconUrl?: string }) {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    if (data.name) { sets.push(`name = $${idx++}`); vals.push(data.name); }
    if (data.date) { sets.push(`date = $${idx++}`); vals.push(data.date.toISOString().slice(0, 10)); }
    if (data.type) { sets.push(`type = $${idx++}`); vals.push(data.type); }
    if (data.appliesTo) { sets.push(`applies_to = $${idx++}`); vals.push(data.appliesTo); }
    if (data.iconUrl) { sets.push(`icon_url = $${idx++}`); vals.push(data.iconUrl); }
    sets.push(`updated_at = $${idx++}`); vals.push(new Date().toISOString());

    const sql = `UPDATE holidays SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(id);
    const res = await this.pool.query(sql, vals);
    return res.rows[0];
  }

  async deleteHoliday(id: string) {
    const sql = `UPDATE holidays SET is_deleted = true, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const res = await this.pool.query(sql, [id]);
    return res.rows[0];
  }

  async searchEmployees(query: string, filters?: { department?: string; role?: string; status?: string }): Promise<Employee[]> {
    let conditions = [];

    if (query) {
      conditions.push(
        or(
          like(employees.firstName, `%${query}%`),
          like(employees.lastName, `%${query}%`),
          like(employees.email, `%${query}%`),
          like(employees.employeeId, `%${query}%`)
        )
      );
    }

    if (filters?.department) {
      conditions.push(eq(employees.department, filters.department));
    }

    if (filters?.role) {
      conditions.push(eq(employees.role, filters.role));
    }

    if (filters?.status) {
      conditions.push(eq(employees.status, filters.status));
    }

    if (conditions.length === 0) {
      return this.getEmployees();
    }

    return await this.db
      .select()
      .from(employees)
      .where(and(...conditions));
  }

  // Expense operations
  async createExpense(data: {
    employeeId: string;
    date: string;
    category: string;
    amount: number;
    description: string;
    receiptUrl: string | null;
    status: string;
  }): Promise<any> {
    try {
      // resolve employee display name
      let employeeName: string | null = null;
      try {
        let emp = await this.getEmployeeByUserId(data.employeeId);
        if (!emp) emp = await this.getEmployeeByEmployeeId(data.employeeId);
        if (emp) {
          employeeName = `${emp.firstName} ${emp.lastName}`.trim();
        }
      } catch (e) {
        // ignore
      }

      const expense = {
        id: randomUUID(),
        employeeId: data.employeeId,
        employeeName: employeeName,
        title: `${data.category} Expense - ${new Date(data.date).toLocaleDateString()}`,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: new Date(data.date),
        receiptUrl: data.receiptUrl,
        status: data.status,
      };

      console.log('Creating expense:', expense);
      const result = await this.db.insert(expenses).values(expense).returning();
      console.log('Created expense:', result[0]);
      return result[0];
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  async getExpenses(employeeId: string): Promise<any[]> {
    try {
      console.log('Fetching expenses for employee:', employeeId);
      const result = await this.db
        .select()
        .from(expenses)
        .where(eq(expenses.employeeId, employeeId))
        .orderBy(expenses.date);
      console.log('Fetched expenses:', result);
      return result;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  // Paginated expenses for a specific employee with optional filters
  async getExpensesPaged(employeeId: string, page = 1, pageSize = 10, filters?: { status?: string; q?: string }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const offset = (page - 1) * pageSize;
    // Build WHERE clauses and parameters for a raw count query and drizzle query
    const whereClauses: string[] = ['employee_id = $1'];
    const values: any[] = [employeeId];
    let idx = 2;

    if (filters?.status) {
      whereClauses.push(`status = $${idx}`);
      values.push(filters.status);
      idx++;
    }

    if (filters?.q) {
      whereClauses.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR category ILIKE $${idx})`);
      values.push(`%${filters.q}%`);
      idx++;
    }

    const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // total via raw SQL
    const countSql = `SELECT COUNT(*)::int AS cnt FROM expenses ${whereSQL}`;
    const countRes = await this.pool.query(countSql, values);
    const total = countRes.rows && countRes.rows[0] ? Number(countRes.rows[0].cnt) : 0;

    // items via drizzle with equivalent filters
    let qBuilder = this.db.select().from(expenses).where(eq(expenses.employeeId, employeeId));
    if (filters?.status) qBuilder = qBuilder.where(eq(expenses.status, filters.status));
    if (filters?.q) {
      const q = `%${filters.q}%`;
      qBuilder = qBuilder.where(or(like(expenses.title, q), like(expenses.description, q), like(expenses.category, q)));
    }

    const items = await qBuilder.orderBy(desc(expenses.createdAt)).limit(pageSize).offset(offset);

    return { items, total, page, pageSize };
  }

  async getAllExpenses(): Promise<any[]> {
    const result = await this.db
      .select()
      .from(expenses)
      .orderBy(desc(expenses.createdAt));
    return result;
  }

  // Paginated all expenses (admin) with optional filters
  async getAllExpensesPaged(page = 1, pageSize = 10, filters?: { status?: string; q?: string }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const offset = (page - 1) * pageSize;
    let query = this.db.select().from(expenses);

    if (filters?.status) query = query.where(eq(expenses.status, filters.status));
    if (filters?.q) {
      const q = `%${filters.q}%`;
      query = query.where(or(like(expenses.title, q), like(expenses.description, q), like(expenses.category, q)));
    }

    // Build WHERE clauses for count
    const whereClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (filters?.status) {
      whereClauses.push(`status = $${idx}`);
      values.push(filters.status);
      idx++;
    }
    if (filters?.q) {
      whereClauses.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR category ILIKE $${idx})`);
      values.push(`%${filters.q}%`);
      idx++;
    }

    const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const countSql = `SELECT COUNT(*)::int AS cnt FROM expenses ${whereSQL}`;
    const countRes = await this.pool.query(countSql, values);
    const total = countRes.rows && countRes.rows[0] ? Number(countRes.rows[0].cnt) : 0;

    // items via drizzle
    let qBuilder = this.db.select().from(expenses);
    if (filters?.status) qBuilder = qBuilder.where(eq(expenses.status, filters.status));
    if (filters?.q) {
      const q = `%${filters.q}%`;
      qBuilder = qBuilder.where(or(like(expenses.title, q), like(expenses.description, q), like(expenses.category, q)));
    }
    const items = await qBuilder.orderBy(desc(expenses.createdAt)).limit(pageSize).offset(offset);
    return { items, total, page, pageSize };
  }

  async updateExpenseStatus(id: string, status: string, approvedBy: string): Promise<any> {
    try {
      const result = await this.db
        .update(expenses)
        .set({
          status,
          approvedBy,
          approvedAt: new Date(),
        })
        .where(eq(expenses.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating expense status:', error);
      throw error;
    }
  }

  // Document operations
  async createDocument(data: {
    employeeId: string;
    type: string;
    name: string;
    url: string;
    uploadedBy: string;
    status: string;
    fileSize?: number;
    mimeType?: string;
  }): Promise<any> {
    try {
      const now = new Date();
      // resolve employee display name
      let employeeName: string | null = null;
      try {
        let emp = await this.getEmployeeByUserId(data.employeeId);
        if (!emp) emp = await this.getEmployeeByEmployeeId(data.employeeId);
        if (emp) {
          employeeName = `${emp.firstName} ${emp.lastName}`.trim();
        }
      } catch (e) {
        // ignore lookup error
      }

      const document = {
        id: randomUUID(),
        employeeId: data.employeeId,
        employeeName: employeeName,
        documentType: data.type,
        documentName: data.name,
        fileUrl: data.url,
        fileSize: data.fileSize || null,
        mimeType: data.mimeType || null,
        uploadedBy: data.uploadedBy,
        isVerified: false,
        status: data.status,
        createdAt: now,
        updatedAt: now,
      } as any;

      console.log('Creating document:', document);
      const result = await this.db.insert(documents).values(document).returning();
      console.log('Created document:', result[0]);
      return result[0];
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  async getDocuments(employeeId: string): Promise<any[]> {
    try {
      console.log('Fetching documents for employee:', employeeId);
      const result = await this.db
        .select()
        .from(documents)
        .where(eq(documents.employeeId, employeeId))
        .orderBy(documents.createdAt);
      console.log('Fetched documents:', result);
      return result;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }

  async updateDocumentStatus(id: string, isVerified: boolean, verifiedBy: string): Promise<any> {
    try {
      const result = await this.db
        .update(documents)
        .set({
          isVerified,
          verifiedBy,
          verifiedAt: new Date(),
        })
        .where(eq(documents.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  }

  // Additional methods for compatibility
  async getPayroll(employeeId?: string, period?: string): Promise<any[]> {
    let query = this.db.select().from(payroll);

    if (employeeId) {
      query = query.where(eq(payroll.employeeId, employeeId));
    }

    if (period) {
      const [year, month] = period.split('-');
      query = query.where(
        and(
          eq(payroll.year, parseInt(year)),
          eq(payroll.month, parseInt(month))
        )
      );
    }

    return await query.orderBy(desc(payroll.createdAt));
  }

  async createPayroll(data: any): Promise<any> {
    const result = await this.db
      .insert(payroll)
      .values({
        ...data,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return result[0];
  }

  async getPayrollByPeriod(period: string): Promise<any[]> {
    const [year, month] = period.split('-');
    return await this.db
      .select()
      .from(payroll)
      .where(
        and(
          eq(payroll.year, parseInt(year)),
          eq(payroll.month, parseInt(month))
        )
      );
  }

  async updatePayroll(id: string, payrollData: Partial<any>): Promise<any> {
    const result = await this.db
      .update(payroll)
      .set({
        ...payrollData,
        updatedAt: new Date()
      })
      .where(eq(payroll.id, id))
      .returning();
    return result[0];
  }



  // GPS Location operations
  async createGPSLocation(location: { attendanceId: string; latitude: number; longitude: number; accuracy: number | null; timestamp: Date }): Promise<any> {
    // Mock implementation for now
    return { id: randomUUID(), ...location };
  }

  async getGPSLocations(attendanceId: string): Promise<any[]> {
    // Mock implementation for now
    return [];
  }

  // Profile operations
  async updateEmployeeProfile(profile: any): Promise<any> {
    const now = new Date();
    // Normalize skills to JSON array if provided as string
    let skillsVal = null;
    if (profile.skills !== undefined) {
      if (Array.isArray(profile.skills)) skillsVal = profile.skills;
      else if (typeof profile.skills === 'string') {
        try {
          skillsVal = JSON.parse(profile.skills);
        } catch (e) {
          skillsVal = profile.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
    }

    // Update the employees table by employeeId
    const setObj: any = {
      updatedAt: now,
    };

    if (profile.phoneNumber !== undefined) setObj.phone = profile.phoneNumber;
    if (profile.emergencyContact !== undefined) setObj.emergencyContact = profile.emergencyContact;
    if (profile.address !== undefined) setObj.address = profile.address;
    // Respect three states for dateOfBirth coming from callers:
    // - undefined: caller didn't include the field -> don't change DB
    // - null: caller explicitly wants to clear the date -> set NULL
    // - non-empty string / date: update to the provided date
    if (Object.prototype.hasOwnProperty.call(profile, 'dateOfBirth')) {
      if (profile.dateOfBirth === null) {
        setObj.dateOfBirth = null;
      } else if (profile.dateOfBirth !== '' && profile.dateOfBirth !== undefined) {
        setObj.dateOfBirth = new Date(profile.dateOfBirth);
      }
      // if profile.dateOfBirth === '' -> treat as omitted (no change)
    }
    if (profile.bloodGroup !== undefined) setObj.bloodGroup = profile.bloodGroup;
    if (profile.maritalStatus !== undefined) setObj.maritalStatus = profile.maritalStatus;
    if (profile.gender !== undefined) setObj.gender = profile.gender;
    if (skillsVal !== null) setObj.skills = skillsVal;
    // Check profilePhotoUrl (sent by profile route) or photo (sent elsewhere) - only update if explicitly provided
    if (profile.profilePhotoUrl !== undefined) setObj.profilePhotoUrl = profile.profilePhotoUrl;
    else if (profile.photo !== undefined) setObj.profilePhotoUrl = profile.photo;
    if (profile.department !== undefined) setObj.department = profile.department;
    if (profile.role !== undefined) setObj.role = profile.role;
    // joinDate: support undefined (no change), null (clear), or value -> Date
    if (Object.prototype.hasOwnProperty.call(profile, 'joinDate')) {
      if (profile.joinDate === null) setObj.joinDate = null;
      else if (profile.joinDate !== '' && profile.joinDate !== undefined) setObj.joinDate = new Date(profile.joinDate);
      // empty string -> treat as omitted
    }
    if (profile.uanNumber !== undefined) setObj.uanNumber = profile.uanNumber;
    if (profile.esicNumber !== undefined) setObj.esicNumber = profile.esicNumber;

    console.log('DEBUG updateEmployeeProfile input profile:', JSON.stringify(profile, null, 2));
    console.log('DEBUG updateEmployeeProfile setObj:', JSON.stringify(setObj, null, 2));

    // Perform update
    await this.db
      .update(employees)
      .set(setObj)
      .where(eq(employees.employeeId, profile.employeeId));

    // Return the updated profile object by querying employees row
    const row = await this.db
      .select()
      .from(employees)
      .where(eq(employees.employeeId, profile.employeeId));

    console.log('DEBUG updateEmployeeProfile: query result after update, row count:', row.length);
    const emp = row[0];
    console.log('DEBUG updateEmployeeProfile: returned employee profilePhotoUrl:', emp?.profilePhotoUrl);
    if (!emp) return null;

    return {
      employeeId: emp.employeeId,
      department: emp.department || null,
      role: emp.role || null,
      gender: emp.gender || null,
      phoneNumber: emp.phone || null,
      emergencyContact: emp.emergencyContact || null,
      address: emp.address || null,
      dateOfBirth: emp.dateOfBirth || null,
      bloodGroup: emp.bloodGroup || null,
      maritalStatus: emp.maritalStatus || null,
      skills: emp.skills || [],
      photo: emp.profilePhotoUrl || null,
      uanNumber: emp.uanNumber || null,
      esicNumber: emp.esicNumber || null,
      updatedAt: now,
    };
  }

  async getEmployeeProfile(employeeId: string): Promise<any> {
    const result = await this.db
      .select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId));
    const emp = result[0];
    if (!emp) return null;

    return {
      employeeId: emp.employeeId,
      phoneNumber: emp.phone || null,
      emergencyContact: emp.emergencyContact || null,
      address: emp.address || null,
      dateOfBirth: emp.dateOfBirth || null,
      joinDate: emp.joinDate || null,
      bloodGroup: emp.bloodGroup || null,
      maritalStatus: emp.maritalStatus || null,
      skills: emp.skills || [],
      photo: emp.profilePhotoUrl || null,
      updatedAt: emp.updatedAt || new Date(),
    };
  }
}
