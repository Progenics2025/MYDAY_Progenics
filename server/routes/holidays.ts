import { Router } from 'express';
import { storage as dbStorage } from '../db-storage';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';

const router = Router();

const holidayStorage = multer.diskStorage({
  destination: './uploads/',
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-holiday-${path.basename(file.originalname)}`);
  }
});
const upload = multer({ storage: holidayStorage });

// List holidays (optional year filter)
router.get('/', async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const rows = await dbStorage.getHolidays(year);
    res.json({ items: rows });
  } catch (err) {
    console.error('GET /api/holidays error', err);
    res.status(500).json({ message: 'Failed to fetch holidays' });
  }
});

// Create holiday (accept icon file)
router.post('/', upload.single('icon'), async (req, res) => {
  try {
    const { name, date, type, appliesTo } = req.body as any;
    let iconUrl = req.body.iconUrl as string | undefined;
    if (req.file) {
      iconUrl = `/uploads/${path.basename(req.file.path)}`;
    }
    const created = await dbStorage.createHoliday({ name, date: new Date(date), type, appliesTo, iconUrl });
    res.status(201).json({ data: created });
  } catch (err) {
    console.error('POST /api/holidays error', err);
    res.status(500).json({ message: 'Failed to create holiday' });
  }
});

// Update holiday
router.patch('/:id', upload.single('icon'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, type, appliesTo } = req.body as any;
    let iconUrl = undefined as string | undefined;
    if (req.file) iconUrl = `/uploads/${path.basename(req.file.path)}`;
    const updated = await dbStorage.updateHoliday(id, { name, date: date ? new Date(date) : undefined, type, appliesTo, iconUrl });
    res.json({ data: updated });
  } catch (err) {
    console.error('PATCH /api/holidays error', err);
    res.status(500).json({ message: 'Failed to update holiday' });
  }
});

// Soft-delete holiday
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbStorage.deleteHoliday(id);
    res.json({ data: deleted });
  } catch (err) {
    console.error('DELETE /api/holidays error', err);
    res.status(500).json({ message: 'Failed to delete holiday' });
  }
});

export default router;
