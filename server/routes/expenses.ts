import { Router } from 'express';
import { storage as dbStorage } from '../storage';
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
  date: z.string(),
  category: z.string(),
  amount: z.string(),
  description: z.string(),
});

router.post('/', upload.single('receipt'), async (req: AuthRequest, res) => {
  try {
    const data = expenseSchema.parse(req.body);
    const employeeId = req.user?.id;
    
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Create expense record
    const expense = await dbStorage.createExpense({
      ...data,
      employeeId,
      amount: parseFloat(data.amount),
      receiptUrl: req.file?.path || null,
      status: 'pending',
    });

    res.status(201).json({ message: 'Expense submitted successfully', data: expense });
  } catch (error) {
    res.status(400).json({ message: 'Failed to submit expense', error });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const employeeId = req.user?.id;
    
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const expenses = await dbStorage.getExpenses(employeeId);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch expenses', error });
  }
});

export default router;
