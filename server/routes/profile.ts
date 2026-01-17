import { Router } from 'express';
import { storage as dbStorage } from '../db-storage';
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

// Configure multer for file uploads - use absolute path to match index.ts static serving
const fileStorage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'profiles'),
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
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  maritalStatus: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  uanNumber: z.preprocess((v) => {
    if (v === '' || v == null) return undefined;
    if (typeof v === 'string' && v.trim().toUpperCase() === 'NA') return undefined;
    return typeof v === 'string' ? v.trim() : v;
  }, z.string().regex(/^\d{12}$/, 'UAN must be 12 digits').optional()),
  esicNumber: z.preprocess((v) => {
    if (v === '' || v == null) return undefined;
    if (typeof v === 'string' && v.trim().toUpperCase() === 'NA') return undefined;
    return typeof v === 'string' ? v.trim() : v;
  }, z.string().regex(/^[A-Za-z0-9-]{6,17}$/, 'ESIC must be 6-17 characters').optional()),
  skills: z.array(z.string()).optional(),
  education: z.array(z.string()).optional(),
  experience: z.array(z.string()).optional(),
});

router.post('/', upload.single('photo'), async (req: AuthRequest, res) => {
  console.log('=== /api/profile POST START ===');
  console.log('DEBUG /api/profile POST content-type:', req.headers['content-type']);
  console.log('DEBUG /api/profile POST req.file present:', !!req.file);
  if (req.file) {
    console.log('DEBUG /api/profile POST req.file details:', { filename: req.file.filename, originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype });
  }
  try {
    console.log('DEBUG /api/profile POST headers:', req.headers.authorization);
    console.log('DEBUG /api/profile POST user:', req.user);
    // When multipart/form-data is used, req.body fields may be strings; coerce arrays and parse JSON strings
    const raw: any = { ...(req.body || {}) };
    if (raw.skills && typeof raw.skills === 'string') {
      try { raw.skills = JSON.parse(raw.skills); } catch (e) { raw.skills = String(raw.skills).split(',').map((s: string) => s.trim()).filter(Boolean); }
    }
    if (raw.education && typeof raw.education === 'string') {
      try { raw.education = JSON.parse(raw.education); } catch (e) { raw.education = [raw.education]; }
    }
    if (raw.experience && typeof raw.experience === 'string') {
      try { raw.experience = JSON.parse(raw.experience); } catch (e) { raw.experience = [raw.experience]; }
    }

    console.log('DEBUG /api/profile POST raw body before parsing:', JSON.stringify(raw, null, 2));

    // Use safeParse to capture validation errors
    const parseResult = profileSchema.safeParse(raw);
    if (!parseResult.success) {
      console.error('ERROR /api/profile POST schema validation failed:', parseResult.error.errors);
      return res.status(400).json({
        message: 'Profile validation failed',
        errors: parseResult.error.errors
      });
    }
    const data = parseResult.data;
    console.log('DEBUG /api/profile POST parsed data:', JSON.stringify(data, null, 2));

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Prefer the session-stored employee if available (login sets this), otherwise fall back to DB lookup and scans
    let employee = (req.user as any)?.employee;
    console.log('DEBUG /api/profile POST initial session employee present:', !!employee, employee && (employee as any).employeeId);

    if (!employee) {
      employee = await dbStorage.getEmployeeByUserId(userId);
      console.log('DEBUG /api/profile POST lookup - by userId result:', !!employee, employee && (employee as any).employeeId);
    }

    // Still not found? try scanning all employees (some dev setups may not have direct mapping)
    if (!employee) {
      try {
        const all = await dbStorage.getEmployees();
        console.log('DEBUG /api/profile POST scanning all employees, count:', Array.isArray(all) ? all.length : 'unknown');
        const found = all.find((e: any) => String(e.userId) === String(userId));
        console.log('DEBUG /api/profile POST found by userId scan:', !!found, found && (found as any).employeeId);
        if (found) {
          employee = found;
          console.log('DEBUG /api/profile POST assigned employee from scan by userId:', employee.employeeId);
        }
        // try by email if available on session
        if (!employee && (req.user as any)?.email) {
          const byEmail = all.find((e: any) => String(e.email).toLowerCase() === String((req.user as any).email).toLowerCase());
          console.log('DEBUG /api/profile POST found by email scan:', !!byEmail, byEmail && (byEmail as any).employeeId);
          if (byEmail) {
            employee = byEmail;
            console.log('DEBUG /api/profile POST assigned employee from scan by email:', employee.employeeId);
          }
        }
      } catch (e) {
        console.error('DEBUG /api/profile POST failed enumerate employees', e);
      }
    }

    // Guard: sometimes session-stored employee exists but lacks an `employeeId` (different dev stores)
    // In that case use the internal `id` as a fallback so updates don't fail with 404.
    if (employee && !(employee as any).employeeId) {
      console.log('DEBUG /api/profile POST session employee missing employeeId, falling back to id:', (employee as any).id);
      (employee as any).employeeId = (employee as any).employeeId || (employee as any).id;
    }

    if (!employee) return res.status(404).json({ message: 'Employee not found for user' });

    // Normalize incoming fields to match storage API and remove undefined values
    const updatePayload: any = {
      employeeId: employee.employeeId,
      phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : undefined,
      emergencyContact: data.emergencyContact !== undefined ? data.emergencyContact : undefined,
      address: data.address !== undefined ? data.address : undefined,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      gender: data.gender !== undefined ? data.gender : undefined,
      bloodGroup: data.bloodGroup !== undefined ? data.bloodGroup : undefined,
      maritalStatus: data.maritalStatus !== undefined ? data.maritalStatus : undefined,
      department: data.department !== undefined ? data.department : undefined,
      role: data.role !== undefined ? data.role : undefined,
      uanNumber: data.uanNumber === null ? null : (data.uanNumber !== undefined ? data.uanNumber : undefined),
      esicNumber: data.esicNumber === null ? null : (data.esicNumber !== undefined ? data.esicNumber : undefined),
      skills: data.skills || [],
      profilePhotoUrl: req.file ? `/uploads/profiles/${req.file.filename}` : undefined,
    };

    Object.keys(updatePayload).forEach(k => {
      if (updatePayload[k] === undefined) delete updatePayload[k];
    });

    console.log('DEBUG /api/profile POST req.file:', req.file);
    console.log('DEBUG /api/profile POST req.file.filename:', req.file?.filename);
    console.log('DEBUG /api/profile POST profilePhotoUrl being set:', req.file ? `/uploads/profiles/${req.file.filename}` : 'NO FILE');
    console.log('DEBUG /api/profile POST updatePayload:', JSON.stringify(updatePayload, null, 2));

    const profile = await dbStorage.updateEmployeeProfile(updatePayload);

    res.json({ message: 'Profile updated successfully', data: profile });
  } catch (error) {
    console.error('ERROR /api/profile POST:', error);
    res.status(400).json({ message: 'Failed to update profile', error: (error as Error).message || error });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    console.log('DEBUG /api/profile GET headers:', req.headers.authorization);
    console.log('DEBUG /api/profile GET user before auth:', req.user);
    const userId = req.user?.id;
    console.log('DEBUG /api/profile GET resolved userId:', userId);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Fetch employee by userId directly (more reliable and efficient)
    let employee = await dbStorage.getEmployeeByUserId(userId);
    // Fallback: some sessions include an `employee` object; use it if DB lookup fails
    if (!employee && (req.user as any)?.employee) {
      employee = (req.user as any).employee;
    }
    if (!employee) {
      try {
        const all = await dbStorage.getEmployees();
        console.log('DEBUG /api/profile GET userId:', userId);
        console.log('DEBUG /api/profile GET employees userIds:', all.map((e: any) => e.userId).slice(0, 50));
        // try to find by loose match
        const found = all.find((e: any) => String(e.userId) === String(userId));
        console.log('DEBUG /api/profile GET foundByScan:', !!found, found && found.employeeId);
        if (found) employee = found;
        // If not found by userId, try matching by user's email (some employees linked only by email)
        if (!employee && (req.user as any)?.email) {
          const byEmail = all.find((e: any) => String(e.email).toLowerCase() === String((req.user as any).email).toLowerCase());
          console.log('DEBUG /api/profile GET foundByEmail:', !!byEmail, byEmail && byEmail.employeeId);
          if (byEmail) employee = byEmail;
        }
      } catch (e) {
        console.error('DEBUG /api/profile GET failed enumerate employees', e);
      }
    }
    // If no employee record exists for this user, return a default empty profile
    if (!employee) {
      const defaultProfile = {
        gender: null,
        phoneNumber: null,
        emergencyContact: null,
        address: null,
        dateOfBirth: null,
        bloodGroup: null,
        maritalStatus: null,
        skills: [],
        photo: null,
        panNumber: null,
        aadhaarNumber: null,
        uanNumber: null,
        esicNumber: null,
        bankAccount: null,
        ifscCode: null,
      };
      return res.json(defaultProfile);
    }

    // Return only profile-related fields from the employee record
    const profile = {
      gender: (employee as any).gender || null,
      phoneNumber: employee.phone || null,
      emergencyContact: (employee as any).emergencyContact || null,
      address: employee.address || null,
      department: (employee as any).department || null,
      role: (employee as any).role || null,
      dateOfBirth: employee.dateOfBirth || null,
      joinDate: employee.joinDate || null,
      bloodGroup: (employee as any).bloodGroup || null,
      maritalStatus: (employee as any).maritalStatus || null,
      skills: Array.isArray((employee as any).skills) ? (employee as any).skills : ((employee as any).skills ? [(employee as any).skills] : []),
      // Add cache-busting query parameter to prevent browser caching of old profile photos
      photo: (employee as any).profilePhotoUrl ? `${(employee as any).profilePhotoUrl}?t=${Date.now()}` : null,
      panNumber: (employee as any).panNumber || null,
      aadhaarNumber: (employee as any).aadhaarNumber || null,
      uanNumber: (employee as any).uanNumber || null,
      esicNumber: (employee as any).esicNumber || null,
      bankAccount: (employee as any).bankAccount || null,
      ifscCode: (employee as any).ifscCode || null,
    };

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile', error });
  }
});

export default router;
