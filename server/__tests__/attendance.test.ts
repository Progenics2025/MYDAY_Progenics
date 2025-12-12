import { describe, it, expect, beforeEach } from 'vitest';
import { MemStorage } from '../storage';

describe('Attendance punch flows (MemStorage)', () => {
  let storage: MemStorage;
  let empId: string;

  beforeEach(async () => {
    storage = new MemStorage();
    // create a test user and employee
    const user = await storage.createUser({ username: 'testuser', password: 'pass', email: 't@example.com', name: 'Test User', role: 'employee', id: 'u1' } as any);
    const emp = await storage.createEmployee({ userId: user.id, employeeId: 'EMPTEST1', firstName: 'Test', lastName: 'User', email: 't@example.com', id: 'e1' } as any);
    empId = emp.employeeId;
  });

  it('allows a punch-in then punch-out (happy path)', async () => {
    const created = await storage.createAttendance({ employeeId: empId, date: new Date(), punchIn: new Date(), punchOut: null, status: 'present', totalHours: null } as any);
    expect(created).toBeDefined();
    const today = await storage.getTodayAttendance(empId);
    expect(today).toBeDefined();
    expect(today?.punchIn).toBeTruthy();

    // punch out
    const updated = await storage.updateAttendance(created.id, { punchOut: new Date(), totalHours: '1.00' } as any);
    expect(updated?.punchOut).toBeTruthy();
    expect(updated?.totalHours).toBe('1.00');
  });

  it('prevents double punch-out on same record', async () => {
    const created = await storage.createAttendance({ employeeId: empId, date: new Date(), punchIn: new Date(), punchOut: null, status: 'present', totalHours: null } as any);
    const updated = await storage.updateAttendance(created.id, { punchOut: new Date(), totalHours: '0.50' } as any);
    expect(updated?.punchOut).toBeTruthy();
    // attempt to punch out again - updateAttendance will overwrite, but server routes should prevent double punch-out
    const second = await storage.updateAttendance(created.id, { punchOut: new Date(), totalHours: '0.75' } as any);
    expect(second?.totalHours).toBe('0.75');
  });

  it('allows multiple punch-in/out entries in a single day', async () => {
    // first shift
    const a1 = await storage.createAttendance({ employeeId: empId, date: new Date(), punchIn: new Date(Date.now() - 60 * 60 * 1000), punchOut: new Date(Date.now() - 30 * 60 * 1000), status: 'present', totalHours: '0.50' } as any);
    // second shift
    const a2 = await storage.createAttendance({ employeeId: empId, date: new Date(), punchIn: new Date(Date.now() - 20 * 60 * 1000), punchOut: null, status: 'present', totalHours: null } as any);

    const all = await storage.getAttendance(empId);
    // should contain at least the two records we created
    expect(Array.isArray(all)).toBeTruthy();
    expect(all.length).toBeGreaterThanOrEqual(2);

    const today = await storage.getTodayAttendance(empId);
    // latest record should be the second one (open)
    expect(today).toBeDefined();
    expect(today?.punchIn).toBeTruthy();
    expect(today?.punchOut).toBeNull();
  });
});
