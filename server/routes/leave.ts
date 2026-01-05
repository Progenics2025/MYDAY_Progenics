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
  if (!leaveDetails) return `<p>Leave Request ID: Unable to process</p>`;
  
  const getStatusBadgeColor = (status: string) => {
    switch((status || '').toLowerCase()) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };
  
  const statusColor = getStatusBadgeColor(leaveDetails?.status);
  
  return `
    <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;background:#f9fafb;padding:20px">
      <div style="max-width:700px;margin:0 auto">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:30px">
          <h1 style="margin:0;font-size:28px;color:#0f172a;font-weight:700">Leave Request Notification</h1>
          <p style="margin:8px 0 0 0;color:#6b7280;font-size:14px">A new leave request requires your attention</p>
        </div>

        <!-- Main Content Box -->
        <div style="background:#fff;border-radius:12px;padding:30px;margin-bottom:20px">
          
          <!-- Employee Info Section -->
          <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e5e7eb">
            <h3 style="margin:0 0 16px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Employee Information</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:0">
              <tr>
                <td width="50%" style="padding-right:10px;vertical-align:top">
                  <div style="padding:12px;background:#f3f4f6;border-radius:8px;border-left:4px solid #3b82f6">
                    <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Employee Name</p>
                    <p style="margin:0;font-size:16px;color:#0f172a;font-weight:700">${leaveDetails?.employeeName || 'N/A'}</p>
                  </div>
                </td>
                <td width="50%" style="padding-left:10px;vertical-align:top">
                  <div style="padding:12px;background:#f3f4f6;border-radius:8px;border-left:4px solid #8b5cf6">
                    <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Employee ID</p>
                    <p style="margin:0;font-size:16px;color:#0f172a;font-weight:700">${leaveDetails?.employeeId || 'N/A'}</p>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Status Section -->
          <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e5e7eb">
            <h3 style="margin:0 0 16px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Request Status</h3>
            <div style="padding:16px;background:#f3f4f6;border-radius:8px;border-left:4px solid ${statusColor}">
              <div style="display:inline-block;padding:6px 16px;background:${statusColor};color:#fff;border-radius:20px;font-weight:600;font-size:14px;text-transform:uppercase">
                ${leaveDetails?.status || 'Pending'}
              </div>
            </div>
          </div>

          <!-- Reason Section -->
          <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e5e7eb">
            <h3 style="margin:0 0 16px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Reason for Leave</h3>
            <div style="padding:16px;background:#f9fafb;border-radius:8px;border-left:4px solid #10b981">
              <p style="margin:0;color:#374151;font-size:14px;line-height:1.6">${leaveDetails?.reason || 'No reason provided'}</p>
            </div>
          </div>

          <!-- Leave Details Grid (using table for email compatibility) -->
          <div style="margin-bottom:20px">
            <h3 style="margin:0 0 16px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Leave Details</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:0">
              <tr>
                <td width="50%" style="padding-right:8px;padding-bottom:16px;vertical-align:top">
                  <div style="padding:14px;background:#f3f4f6;border-radius:8px">
                    <p style="margin:0 0 6px 0;font-size:12px;color:#6b7280;font-weight:600">Leave Type</p>
                    <p style="margin:0;font-size:15px;color:#0f172a;font-weight:600;text-transform:capitalize">${leaveDetails?.leaveType || 'N/A'}</p>
                  </div>
                </td>
                <td width="50%" style="padding-left:8px;padding-bottom:16px;vertical-align:top">
                  <div style="padding:14px;background:#f3f4f6;border-radius:8px">
                    <p style="margin:0 0 6px 0;font-size:12px;color:#6b7280;font-weight:600">Total Days</p>
                    <p style="margin:0;font-size:15px;color:#0f172a;font-weight:600">${String(leaveDetails?.totalDays || '0')} Day(s)</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding-right:8px;vertical-align:top">
                  <div style="padding:14px;background:#f3f4f6;border-radius:8px">
                    <p style="margin:0 0 6px 0;font-size:12px;color:#6b7280;font-weight:600">Start Date</p>
                    <p style="margin:0;font-size:15px;color:#0f172a;font-weight:600">${leaveDetails?.startDate ? new Date(leaveDetails.startDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</p>
                  </div>
                </td>
                <td width="50%" style="padding-left:8px;vertical-align:top">
                  <div style="padding:14px;background:#f3f4f6;border-radius:8px">
                    <p style="margin:0 0 6px 0;font-size:12px;color:#6b7280;font-weight:600">End Date</p>
                    <p style="margin:0;font-size:15px;color:#0f172a;font-weight:600">${leaveDetails?.endDate ? new Date(leaveDetails.endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</p>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center;color:#6b7280;font-size:12px;padding:20px;border-top:1px solid #e5e7eb">
          <p style="margin:0">Request ID: <strong>${leaveDetails?.id || 'N/A'}</strong></p>
          <p style="margin:8px 0 0 0">This is an automated notification. Please do not reply to this email.</p>
        </div>
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
        console.warn('[LEAVE-EMAIL] No manager found to notify for leave request', leaveRequest.id);
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
      }

      // Send email regardless of whether manager was found
      // Determine recipients from environment variable, with hardcoded defaults as fallback
      const rawRecipients = process.env.LEAVE_NOTIFICATION_EMAILS || '';
      let recipients = rawRecipients.split(',').map(s => s.trim()).filter(Boolean);
      
      // Use hardcoded recipients as fallback if environment variable is not configured
      if (recipients.length === 0) {
        recipients = ['karthik.s@progencislabs.com', 'digitalsales@progenicslabs.com', 'pavithra.rk@progenicslabs.com', 'swapnil@progenicslabs.com', 'arunapriya@progenicslabs.com'];
        console.log('[LEAVE-EMAIL] Using default leave notification recipients (LEAVE_NOTIFICATION_EMAILS not configured)');
      }
      
      console.log('[LEAVE-EMAIL] Leave request created:', leaveRequest.id);
      console.log('[LEAVE-EMAIL] Recipients list:', recipients);
      
      if (recipients.length === 0) {
        console.warn('[LEAVE-EMAIL] No leave notification recipients configured. Skipping email send.');
      } else {
        // Use the leave request object we already have instead of querying DB again
        const htmlBody = buildLeaveRequestEmailHtml(leaveRequest);
        console.log('[LEAVE-EMAIL] HTML body generated, length:', htmlBody.length);

        // Send emails concurrently but capture all results
        const sendPromises = recipients.map((to) => {
          console.log('[LEAVE-EMAIL] Sending email to:', to);
          return sendMail({ to, subject: 'New leave request awaiting your approval', text: `A new leave request (${leaveRequest.id}) needs your approval.`, html: htmlBody })
            .then((result: any) => {
              console.log('[LEAVE-EMAIL] Email sent successfully to:', to);
              return { to, ok: true, result };
            })
            .catch((err: any) => {
              console.error('[LEAVE-EMAIL] Email send failed for:', to, err);
              return { to, ok: false, err };
            });
        });

        const settled = await Promise.all(sendPromises);
        for (const r of settled) {
          if (r.ok) {
            const previewUrl = (r as { to: string; ok: true; result: any }).result?.previewUrl || (r as { to: string; ok: true; result: any }).result?.info?.previewUrl;
            if (previewUrl) {
              leaveRequest.previewUrls = leaveRequest.previewUrls || [];
              leaveRequest.previewUrls.push(previewUrl);
              console.log('[LEAVE-EMAIL] Preview URL:', previewUrl);
            }
            console.log('[LEAVE-EMAIL] Leave notification sent to', r.to);
          } else {
            console.error('[LEAVE-EMAIL] Failed to send leave notification to', r.to, (r as { to: string; ok: false; err: any }).err);
          }
        }
      }
    } catch (err) {
      console.error('[LEAVE-EMAIL] Failed to create notification or send mails for leave:', err);
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
