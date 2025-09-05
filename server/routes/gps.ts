import { Router } from 'express';
import { dbStorage } from '../storage';
import { z } from 'zod';

const router = Router();

const gpsSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
});

router.post('/punch-in', async (req, res) => {
  try {
    const data = gpsSchema.parse(req.body);
    const { latitude, longitude, accuracy } = data;
    const employeeId = req.user?.id;

    // Create attendance record with GPS location
    const attendance = await dbStorage.createAttendance({
      employeeId,
      date: new Date(),
      checkIn: new Date(),
      status: 'present',
    });

    // Store GPS location
    await dbStorage.createGPSLocation({
      attendanceId: attendance.id,
      latitude,
      longitude,
      accuracy: accuracy || null,
      timestamp: new Date(),
    });

    res.status(201).json({ message: 'Punch in successful', data: attendance });
  } catch (error) {
    res.status(400).json({ message: 'Failed to punch in', error });
  }
});

export default router;
