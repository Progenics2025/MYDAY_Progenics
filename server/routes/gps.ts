import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const router = Router();

const gpsSchema = z.object({
  employeeId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
});

router.post('/punch-in', async (req, res) => {
  try {
    const data = gpsSchema.parse(req.body);
    const { employeeId, latitude, longitude, accuracy } = data;

    // Create attendance record (storage.createAttendance expects NewAttendance shape)
    const attendance = await storage.createAttendance({
      id: randomUUID(),
      employeeId,
      date: new Date(),
      punchIn: new Date(),
      punchOut: null,
      status: 'present',
    } as any);

    // Store GPS location
    await storage.createGPSLocation({
      attendanceId: attendance.id,
      latitude,
      longitude,
      accuracy: accuracy || null,
      timestamp: new Date(),
    });

    res.status(201).json({ message: 'Punch in successful', data: attendance });
  } catch (error) {
    console.error('Punch in error:', error);
    res.status(400).json({ message: 'Failed to punch in', error });
  }
});

router.post('/punch-out', async (req, res) => {
  try {
    const data = gpsSchema.parse(req.body);
    const { employeeId, latitude, longitude, accuracy } = data;

    // Get today's attendance record
  const attendance = await storage.getTodayAttendance(employeeId);
    if (!attendance) {
      return res.status(404).json({ message: 'No punch-in record found for today' });
    }

    // Update attendance with checkout time
    await storage.updateAttendance(attendance.id, {
      punchOut: new Date(),
    });

    // Store GPS location for punch out
    await storage.createGPSLocation({
      attendanceId: attendance.id,
      latitude,
      longitude,
      accuracy: accuracy || null,
      timestamp: new Date(),
    });

    res.status(200).json({ message: 'Punch out successful' });
  } catch (error) {
    console.error('Punch out error:', error);
    res.status(400).json({ message: 'Failed to punch out', error });
  }
});

export default router;
