import { Router } from 'express';
import { storage as dbStorage } from '../storage';
import { z } from 'zod';
import type { Request } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const router = Router();

const leaveSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  type: z.string(),
  reason: z.string(),
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = leaveSchema.parse(req.body);
    const employeeId = req.user?.id;
    
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Create leave request
    const leaveRequest = await dbStorage.createLeaveRequest({
      ...data,
      employeeId,
      status: 'pending',
    });

    res.status(201).json({ message: 'Leave request submitted successfully', data: leaveRequest });
  } catch (error) {
    res.status(400).json({ message: 'Failed to submit leave request', error });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const employeeId = req.user?.id;
    
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const leaveRequests = await dbStorage.getLeaveRequests(employeeId);
    res.json(leaveRequests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leave requests', error });
  }
});

router.patch('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const leaveRequest = await dbStorage.updateLeaveRequestStatus(id, status, userId);
    res.json({ message: 'Leave request updated successfully', data: leaveRequest });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update leave request', error });
  }
});

export default router;
