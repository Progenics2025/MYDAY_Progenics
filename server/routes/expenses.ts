import { Router } from 'express';
import { storage as dbStorage } from '../db-storage';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import type { Request } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const router = Router();

// Configure multer for file uploads
const fileStorage = multer.diskStorage({
  destination: './uploads/expenses',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${path.basename(file.originalname)}`);
  }
});

const upload = multer({ storage: fileStorage });

const expenseSchema = z.object({
  title: z.string().optional(),
  date: z.string(),
  category: z.string(),
  amount: z.string(),
  description: z.string().optional(),
});

router.post('/', upload.single('receipt'), async (req: AuthRequest, res) => {
  try {
    const data = expenseSchema.parse(req.body);
    // the auth middleware sets req.user to the user object; prefer employee.employeeId when available
    const user = req.user as any;
    let employeeId = user?.id;
    let employeeName = undefined as string | undefined;
    try {
      // try to load employee row linked to this user
      const emp = await dbStorage.getEmployeeByUserId(user?.id);
      if (emp) {
        employeeId = emp.employeeId || employeeId;
        employeeName = `${emp.firstName} ${emp.lastName}`.trim();
      }
    } catch (e) {
      // ignore
    }
    
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Create expense record (map incoming fields to storage API)
    const expense = await dbStorage.createExpense({
      employeeId,
      date: data.date,
      category: data.category,
      amount: parseFloat(data.amount),
      description: data.description || null,
      receiptUrl: req.file?.path || null,
      status: 'pending',
    } as any);

    // attach employeeName to response if available
    if (employeeName) expense.employeeName = employeeName;

    res.status(201).json({ message: 'Expense submitted successfully', data: expense });
  } catch (error) {
    res.status(400).json({ message: 'Failed to submit expense', error });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    let employeeId = user?.id;
    try {
      const emp = await dbStorage.getEmployeeByUserId(user?.id);
      if (emp) employeeId = emp.employeeId || employeeId;
    } catch (e) {
      // ignore
    }
    
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

  const page = parseInt((req.query.page as string) || '1', 10) || 1;
  const pageSize = parseInt((req.query.pageSize as string) || '10', 10) || 10;
  const status = (req.query.status as string) || undefined;
  const q = (req.query.q as string) || undefined;

  const paged = await dbStorage.getExpensesPaged(employeeId, page, pageSize, { status, q });
  res.json(paged);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch expenses', error });
  }
});

// Admin-only: fetch all expenses
router.get('/all', async (req: AuthRequest, res) => {
  try {
    const userRole = (req.user as any)?.role;
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

  const page = parseInt((req.query.page as string) || '1', 10) || 1;
  const pageSize = parseInt((req.query.pageSize as string) || '10', 10) || 10;
  const status = (req.query.status as string) || undefined;
  const q = (req.query.q as string) || undefined;

  const paged = await dbStorage.getAllExpensesPaged(page, pageSize, { status, q });
  res.json(paged);
  } catch (error) {
  console.error('GET /api/expenses/all error:', error);
  res.status(500).json({ message: 'Failed to fetch all expenses', error: String(error) });
  }
});

export default router;
