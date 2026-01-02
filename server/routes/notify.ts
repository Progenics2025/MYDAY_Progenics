import { Router } from 'express';
import type { Request } from 'express';
import { storage as dbStorage } from '../db-storage';
import { sendMail } from '../lib/mailer';
import { authenticateToken } from '../routes';

interface AuthRequest extends Request {
  user?: any;
}

function escapeHtml(input: any) {
  if (!input && input !== 0) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateForEmail(input: any) {
  try {
    const d = new Date(input);
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return String(input || '');
  }
}

const router = Router();

function getFrontendBase(req?: Request) {
  // Prefer explicit FRONTEND_URL env var (public URL for the SPA), then APP_URL, then request Origin, then localhost fallback
  const envFrontend = (process.env.FRONTEND_URL && String(process.env.FRONTEND_URL).trim()) || (process.env.APP_URL && String(process.env.APP_URL).trim());
  if (envFrontend && envFrontend.length > 0) return envFrontend.replace(/\/$/, '');
  if (req && req.headers && req.headers.origin) return String(req.headers.origin).replace(/\/$/, '');
  return 'http://127.0.0.1:5000';
}

// Using DB-backed notifications via storage

// Notify managers about a leave request
router.post('/leave-requests', async (req: AuthRequest, res) => {
  try {
  const { leaveRequestId, managerId, employeeId } = req.body;

    if (!leaveRequestId || !managerId) {
      return res.status(400).json({ message: 'leaveRequestId and managerId are required' });
    }

    // persist notification to DB
    const note = await dbStorage.createNotification({
      notificationType: 'leave_request',
      referenceId: leaveRequestId,
      managerId: managerId || null,
      employeeId: employeeId || null,
      payload: { createdAt: new Date().toISOString() }
    });

  // Send notification emails to two fixed recipients regardless of manager lookup
  const previewUrls: string[] = [];
  try {
      const recipients = ['karthik.s@progencislabs.com', 'digitalsales@progenicslabs.com', 'pavithra.rk@progenicslabs.com', 'swapnil@progenicslabs.com', 'arunapriya@progenicslabs.com'];
      // fetch leave request details to include in mail
      const leaveDetailsRaw = await dbStorage.getLeaveRequestById(leaveRequestId).catch(() => null);
      const leaveDetails = leaveDetailsRaw ? {
        ...leaveDetailsRaw,
        startDate: leaveDetailsRaw.start_date || leaveDetailsRaw.startDate || null,
        endDate: leaveDetailsRaw.end_date || leaveDetailsRaw.endDate || null,
        totalDays: leaveDetailsRaw.total_days || leaveDetailsRaw.totalDays || null,
      } : null;
      const frontendBase = getFrontendBase(req);
      const htmlBody = leaveDetails ? `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.4">
          <div style="max-width:680px;margin:0 auto;padding:20px;border:1px solid #e6e6e6;border-radius:8px;background:#fff">
            <h2 style="margin:0 0 12px 0;color:#0f172a">New Leave Request</h2>
            <p style="margin:0 0 18px 0;color:#334155">A new leave request is awaiting your review. Details are below.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tbody>
                <tr>
                  <td style="padding:8px 6px;font-weight:600;color:#0f172a;width:160px">Employee</td>
                  <td style="padding:8px 6px;color:#475569">${escapeHtml(leaveDetails.employeeName || leaveDetails.employeeId || '')} (${escapeHtml(leaveDetails.employeeId || '')})</td>
                </tr>
                <tr style="background:#fafafa">
                  <td style="padding:8px 6px;font-weight:600;color:#0f172a">Leave Type</td>
                  <td style="padding:8px 6px;color:#475569">${escapeHtml(leaveDetails.leaveType || '')}</td>
                </tr>
                <tr>
                  <td style="padding:8px 6px;font-weight:600;color:#0f172a">Start Date</td>
                  <td style="padding:8px 6px;color:#475569">${formatDateForEmail(leaveDetails.startDate)}</td>
                </tr>
                <tr style="background:#fafafa">
                  <td style="padding:8px 6px;font-weight:600;color:#0f172a">End Date</td>
                  <td style="padding:8px 6px;color:#475569">${formatDateForEmail(leaveDetails.endDate)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 6px;font-weight:600;color:#0f172a">Total Days</td>
                  <td style="padding:8px 6px;color:#475569">${escapeHtml(String(leaveDetails.totalDays || ''))}</td>
                </tr>
                <tr style="background:#fafafa">
                  <td style="padding:8px 6px;font-weight:600;color:#0f172a">Reason</td>
                  <td style="padding:8px 6px;color:#475569">${escapeHtml(leaveDetails.reason || '')}</td>
                </tr>
                <tr>
                  <td style="padding:8px 6px;font-weight:600;color:#0f172a">Status</td>
                  <td style="padding:8px 6px;color:#475569">${escapeHtml(leaveDetails.status || '')}</td>
                </tr>
              </tbody>
            </table>
              <div style="display:flex;gap:8px">
              <a href="${frontendBase}/manager/leave/${leaveRequestId}" style="display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Review Request</a>
              <a href="${frontendBase}/manager/leave" style="display:inline-block;padding:10px 14px;border-radius:6px;color:#2563eb;border:1px solid #c7d2fe;text-decoration:none">Open Leave Dashboard</a>
            </div>
            <p style="margin-top:18px;color:#94a3b8;font-size:12px">This is an automated message from your HR system.</p>
          </div>
        </div>
      ` : `<div>Leave Request ID: ${escapeHtml(leaveRequestId)}</div>`;

      for (const to of recipients) {
        try {
          const result: any = await sendMail({ to, subject: 'New leave request awaiting your approval', text: `A new leave request (${leaveRequestId}) needs your approval.`, html: htmlBody });
          if (result?.previewUrl) {
            previewUrls.push(result.previewUrl);
            console.log('Mail preview URL:', result.previewUrl);
          } else {
            console.log('sendMail result (no previewUrl):', { to, messageId: result?.info?.messageId });
          }
        } catch (e) {
          console.error('Failed to send mail to', to, e);
        }
      }
    } catch (e) {
      console.error('Failed to send manager email:', e);
    }

    // In a real app we'd send an email here. For now return the notification id.
  res.status(201).json({ message: 'Notification created', notificationId: note.id, previewUrls });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create notification', error });
  }
});

// Manager approves leave directly using leave request ID (without creating notification)
router.post('/leave-requests/:leaveRequestId/approve-directly', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { leaveRequestId } = req.params;
    console.log(`[APPROVE-EMAIL] Processing direct approval for leave request: ${leaveRequestId}`);

    const leaveRequest = await dbStorage.getLeaveRequestById(leaveRequestId);
    if (!leaveRequest) {
      console.error(`[APPROVE-EMAIL] Leave request not found: ${leaveRequestId}`);
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Update leave request status to approved
    const updated = await dbStorage.updateLeaveRequestStatus(leaveRequestId, 'approved', req.user?.id);
    console.log(`[APPROVE-EMAIL] Leave request updated: ${leaveRequestId}, status: approved`);

    // Send approval notification email to employee
    try {
      console.log(`[APPROVE-EMAIL] Fetching employee for employeeId: ${leaveRequest.employeeId}`);
      const employee = await dbStorage.getEmployeeByEmployeeId(leaveRequest.employeeId);
      console.log(`[APPROVE-EMAIL] Employee found:`, employee?.email ? `email: ${employee.email}` : 'no email');
      
      if (employee && employee.email) {
        const htmlBody = `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.4">
            <div style="max-width:680px;margin:0 auto;padding:20px;border:1px solid #e6e6e6;border-radius:8px;background:#fff">
              <h2 style="margin:0 0 12px 0;color:#0f172a">Leave Request Approved ✓</h2>
              <p style="margin:0 0 18px 0;color:#334155">Your leave request has been approved.</p>
              <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                <tbody>
                  <tr style="background:#f0fdf4">
                    <td style="padding:8px 6px;font-weight:600;color:#0f172a;width:160px">Status</td>
                    <td style="padding:8px 6px;color:#475569"><strong>Approved</strong></td>
                  </tr>
                </tbody>
              </table>
              <p style="margin-top:18px;color:#94a3b8;font-size:12px">This is an automated message from your HR system.</p>
            </div>
          </div>
        `;
        console.log(`[APPROVE-EMAIL] Sending approval email to: ${employee.email}`);
        await sendMail({ to: employee.email, subject: 'Your leave request has been approved', text: 'Your leave request has been approved.', html: htmlBody });
        console.log(`[APPROVE-EMAIL] Approval notification sent to employee: ${employee.email}`);
      } else {
        console.warn(`[APPROVE-EMAIL] Employee not found or no email for employeeId: ${leaveRequest.employeeId}`);
      }
    } catch (emailErr) {
      console.error('[APPROVE-EMAIL] Failed to send approval email to employee:', emailErr);
    }

    res.json({ message: 'Leave approved successfully', leaveRequest: updated });
  } catch (error) {
    console.error('[APPROVE-EMAIL] Error:', error);
    res.status(500).json({ message: 'Failed to approve leave', error: (error as any).message || String(error) });
  }
});

// Manager approves leave via this endpoint
router.post('/leave-requests/:notificationId/approve', authenticateToken, async (req: AuthRequest, res) => {
  try {
  const { notificationId } = req.params;
  const note = await dbStorage.getNotificationById(notificationId);
  if (!note) return res.status(404).json({ message: 'Notification not found' });

  // mark notification approved in DB
  const approved = await dbStorage.approveNotification(notificationId, req.user?.id || note.manager_id);

  // update leave request status
  const leaveRequest = await dbStorage.updateLeaveRequestStatus(note.reference_id, 'approved', req.user?.id || note.manager_id);

  // Send approval notification email to employee
  try {
    const employee = await dbStorage.getEmployeeByEmployeeId(leaveRequest?.employeeId);
    if (employee && employee.email) {
      const htmlBody = `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.4">
          <div style="max-width:680px;margin:0 auto;padding:20px;border:1px solid #e6e6e6;border-radius:8px;background:#fff">
            <h2 style="margin:0 0 12px 0;color:#0f172a">Leave Request Approved ✓</h2>
            <p style="margin:0 0 18px 0;color:#334155">Your leave request has been approved.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tbody>
                <tr style="background:#f0fdf4">
                  <td style="padding:8px 6px;font-weight:600;color:#0f172a;width:160px">Status</td>
                  <td style="padding:8px 6px;color:#475569"><strong>Approved</strong></td>
                </tr>
              </tbody>
            </table>
            <p style="margin-top:18px;color:#94a3b8;font-size:12px">This is an automated message from your HR system.</p>
          </div>
        </div>
      `;
      await sendMail({ to: employee.email, subject: 'Your leave request has been approved', text: 'Your leave request has been approved.', html: htmlBody });
      console.log('Approval notification sent to employee:', employee.email);
    }
  } catch (emailErr) {
    console.error('Failed to send approval email to employee:', emailErr);
  }

  res.json({ message: 'Leave approved', notification: approved });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve leave', error });
  }
});

// Manager rejects leave via this endpoint - NEW ENDPOINT that works directly with leave request ID
router.post('/reject-leave/:leaveRequestId', authenticateToken, async (req: AuthRequest, res) => {
  try {
  const { leaveRequestId } = req.params;
  const { reason } = req.body;
  
  console.log(`[REJECT] Processing direct rejection for leave request: ${leaveRequestId}, reason: ${reason}`);

  const leaveRequest = await dbStorage.getLeaveRequestById(leaveRequestId);
  if (!leaveRequest) {
    console.error(`[REJECT] Leave request not found: ${leaveRequestId}`);
    return res.status(404).json({ message: 'Leave request not found' });
  }

  // Update leave request status to rejected (does NOT deduct leave balance)
  const updated = await dbStorage.updateLeaveRequestStatus(leaveRequestId, 'rejected', req.user?.id);
  console.log(`[REJECT] Leave request updated: ${leaveRequestId}, status: rejected`);

  // Send rejection notification email to employee
  try {
    const employee = await dbStorage.getEmployeeByEmployeeId(leaveRequest.employeeId);
    if (employee && employee.email) {
      const htmlBody = `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.4">
          <div style="max-width:680px;margin:0 auto;padding:20px;border:1px solid #e6e6e6;border-radius:8px;background:#fff">
            <h2 style="margin:0 0 12px 0;color:#0f172a">Leave Request Rejected</h2>
            <p style="margin:0 0 18px 0;color:#334155">Your leave request has been rejected.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tbody>
                <tr style="background:#fef2f2">
                  <td style="padding:8px 6px;font-weight:600;color:#0f172a;width:160px">Status</td>
                  <td style="padding:8px 6px;color:#475569"><strong>Rejected</strong></td>
                </tr>
                ${reason ? `<tr style="background:#fef2f2">
                  <td style="padding:8px 6px;font-weight:600;color:#0f172a">Reason</td>
                  <td style="padding:8px 6px;color:#475569">${escapeHtml(reason)}</td>
                </tr>` : ''}
              </tbody>
            </table>
            <p style="margin-top:18px;color:#94a3b8;font-size:12px">This is an automated message from your HR system.</p>
          </div>
        </div>
      `;
      await sendMail({ to: employee.email, subject: 'Your leave request has been rejected', text: `Your leave request has been rejected.${reason ? ` Reason: ${reason}` : ''}`, html: htmlBody });
      console.log('Rejection notification sent to employee:', employee.email);
    }
  } catch (emailErr) {
    console.error('Failed to send rejection email to employee:', emailErr);
  }

  res.json({ message: 'Leave rejected successfully', leaveRequest: updated });
  } catch (error) {
    console.error('[REJECT] Error:', error);
    res.status(500).json({ message: 'Failed to reject leave', error: (error as any).message || String(error) });
  }
});

// Manager rejects leave via this endpoint (OLD - kept for backward compatibility)
router.post('/leave-requests/:notificationId/reject', authenticateToken, async (req: AuthRequest, res) => {
  try {
  const { notificationId } = req.params;
  const { reason } = req.body;
  
  console.log(`[REJECT] Processing rejection for notification: ${notificationId}, reason: ${reason}`);

  const note = await dbStorage.getNotificationById(notificationId);
  if (!note) {
    console.error(`[REJECT] Notification not found: ${notificationId}`);
    return res.status(404).json({ message: 'Notification not found' });
  }

  // mark notification rejected in DB
  const rejected = await dbStorage.rejectNotification(notificationId, req.user?.id || note.manager_id, reason);
  console.log(`[REJECT] Notification rejected successfully: ${notificationId}`);

  // update leave request status to rejected (does NOT deduct leave balance)
  const updated = await dbStorage.updateLeaveRequestStatus(note.reference_id, 'rejected', req.user?.id || note.manager_id);
  console.log(`[REJECT] Leave request updated: ${note.reference_id}, status: rejected`);

  // Send rejection notification email to employee
  try {
    const leaveRequest = await dbStorage.getLeaveRequestById(note.reference_id);
    if (leaveRequest) {
      const employee = await dbStorage.getEmployeeByEmployeeId(leaveRequest.employeeId);
      if (employee && employee.email) {
        const htmlBody = `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.4">
            <div style="max-width:680px;margin:0 auto;padding:20px;border:1px solid #e6e6e6;border-radius:8px;background:#fff">
              <h2 style="margin:0 0 12px 0;color:#0f172a">Leave Request Rejected</h2>
              <p style="margin:0 0 18px 0;color:#334155">Your leave request has been rejected.</p>
              <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                <tbody>
                  <tr style="background:#fef2f2">
                    <td style="padding:8px 6px;font-weight:600;color:#0f172a;width:160px">Status</td>
                    <td style="padding:8px 6px;color:#475569"><strong>Rejected</strong></td>
                  </tr>
                  ${reason ? `<tr style="background:#fef2f2">
                    <td style="padding:8px 6px;font-weight:600;color:#0f172a">Reason</td>
                    <td style="padding:8px 6px;color:#475569">${escapeHtml(reason)}</td>
                  </tr>` : ''}
                </tbody>
              </table>
              <p style="margin-top:18px;color:#94a3b8;font-size:12px">This is an automated message from your HR system.</p>
            </div>
          </div>
        `;
        await sendMail({ to: employee.email, subject: 'Your leave request has been rejected', text: `Your leave request has been rejected.${reason ? ` Reason: ${reason}` : ''}`, html: htmlBody });
        console.log('Rejection notification sent to employee:', employee.email);
      }
    }
  } catch (emailErr) {
    console.error('Failed to send rejection email to employee:', emailErr);
  }

  res.json({ message: 'Leave rejected successfully', notification: rejected, leaveRequest: updated });
  } catch (error) {
    console.error('[REJECT] Error:', error);
    res.status(500).json({ message: 'Failed to reject leave', error: (error as any).message || String(error) });
  }
});

// Return notifications relevant to the current user (manager or employee)
router.get('/leave-requests/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  // Accept pagination/filtering query params for employee's own leaves
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 10);
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;

  // The employee's leaveRequests are keyed by employeeId (employee.employeeId), so resolve employee record
  const emp = await dbStorage.getEmployeeByUserId(userId).catch(() => null);
  if (!emp) return res.json({ items: [], total: 0, page, pageSize });

  const paged = await dbStorage.getLeaveRequestsPaged(emp.employeeId, page, pageSize, { status, q });
  res.json(paged);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error });
  }
});

// Manager UI: list all leave requests
router.get('/leave-requests/list', authenticateToken, async (req: AuthRequest, res) => {
  try {
  // Admin/manager can fetch all leave requests with pagination and filters
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 10);
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;

  const paged = await dbStorage.getAllLeaveRequestsPaged(page, pageSize, { status, q, employeeId });
  res.json(paged);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leave requests', error });
  }
});

export default router;
