import { Router } from 'express';
import { storage as dbStorage } from '../db-storage';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';
import { z } from 'zod';

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const router = Router();

// Ensure uploads directory exists
const uploadDir = './uploads/documents';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter function
const fileFilter = (req: any, file: any, cb: any) => {
  // Accept only PDF and images
  if (file.mimetype === 'application/pdf' ||
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpg') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and image files are allowed.'), false);
  }
};

// Configure multer for file uploads
const fileStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    // Generate a safe filename
    const fileName = file.originalname.toLowerCase().replace(/[^a-z0-9.]/g, '-');
    cb(null, `${Date.now()}-${fileName}`);
  }
});

// Configure multer upload
const upload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

const documentSchema = z.object({
  documentType: z.string(),
  documentName: z.string(),
});

router.post('/', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const data = documentSchema.parse(req.body);
    const user = req.user as any;
    let employeeId = user?.id;
    let employeeName: string | undefined = undefined;
    try {
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

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create document record (map fields to storage API and include file metadata)
    const document = await dbStorage.createDocument({
      employeeId,
      type: data.documentType,
      name: data.documentName,
      url: req.file.path,
      uploadedBy: employeeId,
      status: 'active',
      // include file metadata if available; PostgresStorage currently sets defaults for size/mime
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    } as any);

    if (employeeName) document.employeeName = employeeName;

    res.status(201).json({ message: 'Document uploaded successfully', data: document });
  } catch (error: any) {
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ message: `File upload error: ${error.message}` });
    }

    // Handle validation errors
    if (error.errors) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }

    console.error('Document upload error:', error);
    res.status(500).json({ message: 'Failed to upload document', error: error.message });
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
