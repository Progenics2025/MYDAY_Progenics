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
  destination: './uploads/documents',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${path.basename(file.originalname)}`);
  }
});

const upload = multer({ storage: fileStorage });

const documentSchema = z.object({
  type: z.string(),
  name: z.string(),
});

router.post('/', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const data = documentSchema.parse(req.body);
    const employeeId = req.user?.id;
    
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create document record
    const document = await dbStorage.createDocument({
      ...data,
      employeeId,
      url: req.file.path,
      uploadedBy: employeeId,
      status: 'active',
    });

    res.status(201).json({ message: 'Document uploaded successfully', data: document });
  } catch (error) {
    res.status(400).json({ message: 'Failed to upload document', error });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const employeeId = req.user?.id;
    
    if (!employeeId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const documents = await dbStorage.getDocuments(employeeId);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents', error });
  }
});

export default router;
