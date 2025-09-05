import { Router } from 'express';
import { storage as dbStorage } from '../storage';
import multer from 'multer';
import path from 'path';
import type { Request } from 'express';
import { z } from 'zod';

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const router = Router();

// Configure multer for file uploads
const fileStorage = multer.diskStorage({
  destination: './uploads/profiles',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${path.basename(file.originalname)}`);
  }
});

const upload = multer({ storage: fileStorage });

const profileSchema = z.object({
  phoneNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  maritalStatus: z.string().optional(),
  skills: z.array(z.string()).optional(),
  education: z.array(z.string()).optional(),
  experience: z.array(z.string()).optional(),
});

router.post('/', upload.single('photo'), async (req: AuthRequest, res) => {
  try {
    const data = profileSchema.parse(req.body);
    const employeeId = req.user?.id;
    
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Create or update profile
    const profile = await dbStorage.updateEmployeeProfile({
      ...data,
      employeeId,
      photo: req.file?.path,
      skills: data.skills || [],
      education: data.education || [],
      experience: data.experience || [],
    });

    res.json({ message: 'Profile updated successfully', data: profile });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update profile', error });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const employeeId = req.user?.id;
    
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const profile = await dbStorage.getEmployeeProfile(employeeId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile', error });
  }
});

export default router;
