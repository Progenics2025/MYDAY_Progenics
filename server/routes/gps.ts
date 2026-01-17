import { Router } from 'express';
import { storage } from '../db-storage';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const router = Router();

const gpsSchema = z.object({
  employeeId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
});

// Reverse geocoding function using OpenStreetMap Nominatim API
async function getAddress(latitude: number, longitude: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'MyDay-HRMS/1.0'
        }
      }
    );
    if (!response.ok) return null;
    const data = await response.json();

    // Build a concise address from components
    const addr = data.address;
    if (!addr) return data.display_name || null;

    const parts = [];
    if (addr.building) parts.push(addr.building);
    if (addr.road) parts.push(addr.road);
    if (addr.suburb) parts.push(addr.suburb);
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);

    return parts.length > 0 ? parts.join(', ') : data.display_name || null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}

router.post('/punch-in', async (req, res) => {
  try {
    const data = gpsSchema.parse(req.body);
    const { employeeId, latitude, longitude, accuracy } = data;

    // Fetch address asynchronously
    const address = await getAddress(latitude, longitude);

    // Create attendance record (storage.createAttendance expects NewAttendance shape)
    const attendance = await storage.createAttendance({
      id: randomUUID(),
      employeeId,
      date: new Date(),
      punchIn: new Date(),
      punchOut: null,
      status: 'present',
    } as any);

    // Store GPS location with address
    await storage.createGPSLocation({
      attendanceId: attendance.id,
      latitude,
      longitude,
      accuracy: accuracy || null,
      address: address || null,
      timestamp: new Date(),
    });

    res.status(201).json({ message: 'Punch in successful', data: attendance, address });
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

    // Fetch address asynchronously
    const address = await getAddress(latitude, longitude);

    // Update attendance with checkout time
    await storage.updateAttendance(attendance.id, {
      punchOut: new Date(),
    });

    // Store GPS location for punch out with address
    await storage.createGPSLocation({
      attendanceId: attendance.id,
      latitude,
      longitude,
      accuracy: accuracy || null,
      address: address || null,
      timestamp: new Date(),
    });

    res.status(200).json({ message: 'Punch out successful', address });
  } catch (error) {
    console.error('Punch out error:', error);
    res.status(400).json({ message: 'Failed to punch out', error });
  }
});

export default router;

