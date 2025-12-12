import { Router } from 'express';
import { storage as dbStorage } from '../db-storage';
import { z } from 'zod';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { sendMail } from '../lib/mailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Build the HTML body for leave request notifications so it can be reused
function buildLeaveRequestEmailHtml(leaveDetails: any) {
  if (!leaveDetails) return `Leave Request ID: ${leaveDetails?.id || ''}`;
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.4">
      <div style="max-width:680px;margin:0 auto;padding:20px;border:1px solid #e6e6e6;border-radius:8px;background:#fff">
        <h2 style="margin:0 0 12px 0;color:#0f172a">New Leave Request</h2>
        <p style="margin:0 0 18px 0;color:#334155">A new leave request is awaiting your review. Details are below.</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tbody>
            <tr>
              <td style="padding:8px 6px;font-weight:600;color:#0f172a;width:160px">Employee</td>
              <td style="padding:8px 6px;color:#475569">${leaveDetails?.employeeName || leaveDetails?.employeeId || ''} (${leaveDetails?.employeeId || ''})</td>
            </tr>
            <tr style="background:#fafafa">
              <td style="padding:8px 6px;font-weight:600;color:#0f172a">Leave Type</td>
              <td style="padding:8px 6px;color:#475569">${leaveDetails?.leaveType || ''}</td>
            </tr>
            <tr>
              <td style="padding:8px 6px;font-weight:600;color:#0f172a">Start Date</td>
              <td style="padding:8px 6px;color:#475569">${leaveDetails?.startDate ? new Date(leaveDetails.startDate).toLocaleDateString() : ''}</td>
            </tr>
            <tr style="background:#fafafa">
              <td style="padding:8px 6px;font-weight:600;color:#0f172a">End Date</td>
              <td style="padding:8px 6px;color:#475569">${leaveDetails?.endDate ? new Date(leaveDetails.endDate).toLocaleDateString() : ''}</td>
            </tr>
            <tr>
              <td style="padding:8px 6px;font-weight:600;color:#0f172a">Total Days</td>
              <td style="padding:8px 6px;color:#475569">${String(leaveDetails?.totalDays || '')}</td>
            </tr>
            <tr style="background:#fafafa">
              <td style="padding:8px 6px;font-weight:600;color:#0f172a">Reason</td>
              <td style="padding:8px 6px;color:#475569">${leaveDetails?.reason || ''}</td>
            </tr>
            <tr>
              <td style="padding:8px 6px;font-weight:600;color:#0f172a">Status</td>
              <td style="padding:8px 6px;color:#475569">${leaveDetails?.status || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const router = Router();

// Setup multer storage for leave document uploads
const leaveStorage = multer.diskStorage({
  destination: './uploads/',
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-leave-${path.basename(file.originalname)}`);
  }
});
const upload = multer({ storage: leaveStorage });

const leaveSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  leaveType: z.string(),
  reason: z.string(),
  totalDays: z.number().optional(),
  status: z.string().optional()
});

// Accept optional file upload under field name 'document'
router.post('/', upload.single('document'), async (req: AuthRequest, res) => {
  try {
    // If multipart/form-data, req.body fields are strings
    const parsedBody = {
      ...req.body,
      totalDays: req.body.totalDays ? Number(req.body.totalDays) : undefined
    } as any;
    console.log('POST /api/leave-requests - parsedBody:', parsedBody);
    console.log('POST /api/leave-requests - file:', req.file ? { originalname: req.file.originalname, path: req.file.path, size: req.file.size } : null);
    let data;
    try {
      data = leaveSchema.parse(parsedBody);
    } catch (zErr) {
      console.error('Leave schema validation failed:', zErr);
      return res.status(400).json({ message: 'Validation failed', details: (zErr as any).issues || zErr });
    }

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

    // Compute totalDays if not provided
    let totalDays = data.totalDays;
    try {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (!totalDays) {
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalDays = diff;
      }
    } catch (err) {
      // leave totalDays as-is if parse fails
    }

    // Validate allowed leave types (disallow maternity/paternity via API)
    const allowedTypes = ['casual', 'earned', 'sick'];
    if (!allowedTypes.includes(data.leaveType.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid leave type' });
    }

    // If sick leave for more than 2 days, ensure a document was uploaded
    let documentUrl: string | null = null;
    if (data.leaveType.toLowerCase() === 'sick' && (totalDays || 0) > 2) {
      if (!req.file) {
        return res.status(400).json({ message: 'Medical document is required for sick leave longer than 2 days' });
      }
      // store relative file path; you can adjust to public URL if you host uploads
      documentUrl = `/uploads/${path.basename(req.file.path)}`;
      try {
        const buf = await fs.promises.readFile(req.file.path);
        const b64 = buf.toString('base64');
        (req as any).documentBlob = b64;
        console.log('Read uploaded file, size:', buf.length);
      } catch (fErr) {
        console.error('Failed to read uploaded file for blob:', fErr);
      }
    } else if (req.file) {
      // If a file was attached and not required, still store it
      documentUrl = `/uploads/${path.basename(req.file.path)}`;
      try {
        const buf = await fs.promises.readFile(req.file.path);
        const b64 = buf.toString('base64');
        (req as any).documentBlob = b64;
        console.log('Read uploaded file, size:', buf.length);
      } catch (fErr) {
        console.error('Failed to read uploaded file for blob:', fErr);
      }
    }

    // Create leave request (storage expects dates as Date objects)
    const leaveRequest = await dbStorage.createLeaveRequest({
      employeeId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      leaveType: data.leaveType,
      reason: data.reason,
      totalDays: totalDays || 0,
      status: data.status || 'pending',
      documentUrl,
    } as any);


    // Find a manager to notify (pick first employee with role containing 'Manager')
    // Notification creation + email sending is handled in a single try/catch to
    // avoid nested failure modes and ensure consistent logging.
    try {
      const allEmployees = await dbStorage.getEmployees();
      const manager = allEmployees.find((e: any) => (e.role || '').toLowerCase().includes('manager'));
      if (!manager) {
        console.warn('No manager found to notify for leave request', leaveRequest.id);
      } else {
        const managerIdToNotify = manager.userId || manager.id;

        // Create notification in DB
        const note = await dbStorage.createNotification({
          notificationType: 'leave_request',
          referenceId: leaveRequest.id,
          managerId: managerIdToNotify,
          employeeId: leaveRequest.employeeId,
          payload: { createdAt: new Date().toISOString() }
        });
        if (note && note.id) leaveRequest.notificationId = note.id;

        // Determine recipients from environment variable
        const rawRecipients = process.env.LEAVE_NOTIFICATION_EMAILS || '';
        const recipients = rawRecipients.split(',').map(s => s.trim()).filter(Boolean);
        if (recipients.length === 0) {
          console.warn('No leave notification recipients configured (LEAVE_NOTIFICATION_EMAILS). Skipping email send.');
        } else {
          const leaveDetails = await dbStorage.getLeaveRequestById(leaveRequest.id).catch(() => null);
          const htmlBody = buildLeaveRequestEmailHtml(leaveDetails || leaveRequest);

          // Send emails concurrently but capture all results
          const sendPromises = recipients.map((to) =>
            sendMail({ to, subject: 'New leave request awaiting your approval', text: `A new leave request (${leaveRequest.id}) needs your approval.`, html: htmlBody })
              .then((result: any) => ({ to, ok: true, result }))
              .catch((err: any) => ({ to, ok: false, err }))
          );

          const settled = await Promise.all(sendPromises);
          for (const r of settled) {
            if (r.ok) {
              const previewUrl = (r as { to: string; ok: true; result: any }).result?.previewUrl || (r as { to: string; ok: true; result: any }).result?.info?.previewUrl;
              if (previewUrl) {
                leaveRequest.previewUrls = leaveRequest.previewUrls || [];
                leaveRequest.previewUrls.push(previewUrl);
              }
              console.log('Leave notification sent to', r.to);
            } else {
              console.error('Failed to send leave notification to', r.to, (r as { to: string; ok: false; err: any }).err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to create notification or send mails for leave:', err);
    }

    res.status(201).json({ message: 'Leave request submitted successfully', data: leaveRequest });
  } catch (error) {
    console.error('Leave request error:', error);
    res.status(400).json({ message: 'Failed to submit leave request', error });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 10);
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;

  const emp = await dbStorage.getEmployeeByUserId(userId).catch(() => null);
  if (!emp) return res.json({ items: [], total: 0, page, pageSize });

  const paged = await dbStorage.getLeaveRequestsPaged(emp.employeeId, page, pageSize, { status, q });
  res.json(paged);
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
