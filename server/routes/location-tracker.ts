import { Router } from 'express';
import { storage } from '../db-storage';
import { z } from 'zod';
import type { Request } from 'express';
import { randomUUID } from 'crypto';

interface AuthenticatedRequest extends Request {
    user?: { id: string; employeeId?: string } | null;
}

const router = Router();

// Schema for location tracking
const locationPointSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional(),
    altitude: z.number().optional(),
    speed: z.number().optional(),
    heading: z.number().optional(),
    batteryLevel: z.number().optional(),
    timestamp: z.string().or(z.date())
});

const trackLocationSchema = z.object({
    employeeId: z.string(),
    attendanceId: z.string().optional(),
    locations: z.array(locationPointSchema)
});

const visitSchema = z.object({
    employeeId: z.string(),
    attendanceId: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
    placeName: z.string().optional(),
    arrivalTime: z.string().or(z.date()),
    departureTime: z.string().or(z.date()).optional(),
    durationMinutes: z.number().optional(),
    visitType: z.enum(['client', 'office', 'break', 'unknown']).optional(),
    notes: z.string().optional()
});

// POST /api/location/track - Receive periodic location updates (batched)
router.post('/track', async (req: AuthenticatedRequest, res) => {
    try {
        const data = trackLocationSchema.parse(req.body);
        const { employeeId, attendanceId, locations } = data;

        if (!locations || locations.length === 0) {
            return res.status(400).json({ message: 'No locations provided' });
        }

        // Insert all locations
        const insertedLocations = [];
        for (const loc of locations) {
            const id = randomUUID();
            const result = await (storage as any).createLocationTrail({
                id,
                employeeId,
                attendanceId: attendanceId || null,
                latitude: loc.latitude,
                longitude: loc.longitude,
                accuracy: loc.accuracy || null,
                altitude: loc.altitude || null,
                speed: loc.speed || null,
                heading: loc.heading || null,
                batteryLevel: loc.batteryLevel || null,
                timestamp: new Date(loc.timestamp)
            });
            insertedLocations.push(result);
        }

        console.log(`[Location Tracker] Saved ${insertedLocations.length} location points for employee ${employeeId}`);

        res.status(201).json({
            message: 'Locations saved successfully',
            count: insertedLocations.length
        });
    } catch (error) {
        console.error('Error saving location:', error);
        res.status(400).json({ message: 'Failed to save location', error: String(error) });
    }
});

// POST /api/location/visit - Create or update a visit record
router.post('/visit', async (req: AuthenticatedRequest, res) => {
    try {
        const data = visitSchema.parse(req.body);

        const visit = await (storage as any).createVisit({
            id: randomUUID(),
            employeeId: data.employeeId,
            attendanceId: data.attendanceId || null,
            latitude: data.latitude,
            longitude: data.longitude,
            address: data.address || null,
            placeName: data.placeName || null,
            arrivalTime: new Date(data.arrivalTime),
            departureTime: data.departureTime ? new Date(data.departureTime) : null,
            durationMinutes: data.durationMinutes || null,
            visitType: data.visitType || 'unknown',
            notes: data.notes || null
        });

        res.status(201).json({ message: 'Visit recorded', data: visit });
    } catch (error) {
        console.error('Error creating visit:', error);
        res.status(400).json({ message: 'Failed to record visit', error: String(error) });
    }
});

// PUT /api/location/visit/:id - Update a visit (e.g., add departure time)
router.put('/visit/:id', async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const visit = await (storage as any).updateVisit(id, {
            ...updates,
            departureTime: updates.departureTime ? new Date(updates.departureTime) : undefined,
            updatedAt: new Date()
        });

        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        res.json({ message: 'Visit updated', data: visit });
    } catch (error) {
        console.error('Error updating visit:', error);
        res.status(400).json({ message: 'Failed to update visit', error: String(error) });
    }
});

// GET /api/location/trail/:employeeId - Get location trail for a date range
router.get('/trail/:employeeId', async (req: AuthenticatedRequest, res) => {
    try {
        const { employeeId } = req.params;
        const { date, startDate, endDate } = req.query;

        let start: Date, end: Date;

        if (date) {
            // Single day
            start = new Date(date as string);
            start.setHours(0, 0, 0, 0);
            end = new Date(date as string);
            end.setHours(23, 59, 59, 999);
        } else if (startDate && endDate) {
            start = new Date(startDate as string);
            end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
        } else {
            // Default to today
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        }

        const trail = await (storage as any).getLocationTrail(employeeId, start, end);

        // Calculate distance if there are enough points
        let totalDistanceKm = 0;
        if (trail.length > 1) {
            for (let i = 1; i < trail.length; i++) {
                totalDistanceKm += haversineDistance(
                    trail[i - 1].latitude,
                    trail[i - 1].longitude,
                    trail[i].latitude,
                    trail[i].longitude
                );
            }
        }

        res.json({
            employeeId,
            date: date || `${startDate} to ${endDate}`,
            pointCount: trail.length,
            totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
            trail
        });
    } catch (error) {
        console.error('Error fetching location trail:', error);
        res.status(500).json({ message: 'Failed to fetch location trail', error: String(error) });
    }
});

// GET /api/location/visits/:employeeId - Get visits for a date range
router.get('/visits/:employeeId', async (req: AuthenticatedRequest, res) => {
    try {
        const { employeeId } = req.params;
        const { date, startDate, endDate } = req.query;

        let start: Date, end: Date;

        if (date) {
            start = new Date(date as string);
            start.setHours(0, 0, 0, 0);
            end = new Date(date as string);
            end.setHours(23, 59, 59, 999);
        } else if (startDate && endDate) {
            start = new Date(startDate as string);
            end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
        } else {
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        }

        const visits = await (storage as any).getVisits(employeeId, start, end);

        // Calculate total time at visits
        let totalVisitMinutes = 0;
        visits.forEach((v: any) => {
            if (v.duration_minutes) {
                totalVisitMinutes += v.duration_minutes;
            }
        });

        res.json({
            employeeId,
            visitCount: visits.length,
            totalVisitMinutes,
            visits
        });
    } catch (error) {
        console.error('Error fetching visits:', error);
        res.status(500).json({ message: 'Failed to fetch visits', error: String(error) });
    }
});

// GET /api/location/summary/:employeeId - Get daily summary
router.get('/summary/:employeeId', async (req: AuthenticatedRequest, res) => {
    try {
        const { employeeId } = req.params;
        const { date } = req.query;

        const targetDate = date ? new Date(date as string) : new Date();
        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);

        // Get trail and visits
        const [trail, visits] = await Promise.all([
            (storage as any).getLocationTrail(employeeId, start, end),
            (storage as any).getVisits(employeeId, start, end)
        ]);

        // Calculate distance
        let totalDistanceKm = 0;
        if (trail.length > 1) {
            for (let i = 1; i < trail.length; i++) {
                totalDistanceKm += haversineDistance(
                    trail[i - 1].latitude,
                    trail[i - 1].longitude,
                    trail[i].latitude,
                    trail[i].longitude
                );
            }
        }

        // Calculate work hours
        let workHours = 0;
        if (trail.length >= 2) {
            const firstPoint = new Date(trail[0].timestamp);
            const lastPoint = new Date(trail[trail.length - 1].timestamp);
            workHours = (lastPoint.getTime() - firstPoint.getTime()) / (1000 * 60 * 60);
        }

        // Count visit types
        const visitsByType = visits.reduce((acc: any, v: any) => {
            const type = v.visit_type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        res.json({
            employeeId,
            date: targetDate.toISOString().split('T')[0],
            summary: {
                totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
                workHours: Math.round(workHours * 100) / 100,
                locationPoints: trail.length,
                totalVisits: visits.length,
                visitsByType,
                firstLocation: trail[0] || null,
                lastLocation: trail[trail.length - 1] || null
            }
        });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ message: 'Failed to fetch summary', error: String(error) });
    }
});

// GET /api/location/all-employees - Get all employee locations for a date (admin view)
router.get('/all-employees', async (req: AuthenticatedRequest, res) => {
    try {
        const { date } = req.query;

        const targetDate = date ? new Date(date as string) : new Date();
        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);

        // Get all employees
        const employees = await storage.getEmployees();

        // Get trails and summary for each employee
        const results = await Promise.all(
            employees.map(async (emp) => {
                const trail = await (storage as any).getLocationTrail(emp.employeeId, start, end);
                const visits = await (storage as any).getVisits(emp.employeeId, start, end);

                // Calculate distance
                let totalDistanceKm = 0;
                if (trail.length > 1) {
                    for (let i = 1; i < trail.length; i++) {
                        totalDistanceKm += haversineDistance(
                            trail[i - 1].latitude,
                            trail[i - 1].longitude,
                            trail[i].latitude,
                            trail[i].longitude
                        );
                    }
                }

                return {
                    employeeId: emp.employeeId,
                    employeeName: `${emp.firstName} ${emp.lastName}`,
                    department: emp.department,
                    locationPoints: trail.length,
                    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
                    visitCount: visits.length,
                    lastLocation: trail[trail.length - 1] || null,
                    trail: trail // Include full trail for map display
                };
            })
        );

        // Filter to only employees with location data
        const activeEmployees = results.filter(r => r.locationPoints > 0);

        res.json({
            date: targetDate.toISOString().split('T')[0],
            totalEmployees: activeEmployees.length,
            employees: activeEmployees
        });
    } catch (error) {
        console.error('Error fetching all employee locations:', error);
        res.status(500).json({ message: 'Failed to fetch employee locations', error: String(error) });
    }
});

// Haversine formula to calculate distance between two GPS coordinates
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

export default router;
