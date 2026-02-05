import { Router } from 'express';
import { storage as dbStorage } from '../db-storage';
import { z } from 'zod';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { sendMail } from '../lib/mailer';

// Build the HTML body for permission request notifications
function buildPermissionRequestEmailHtml(permissionDetails: any) {
    if (!permissionDetails) return `<p>Permission Request ID: Unable to process</p>`;

    const getStatusBadgeColor = (status: string) => {
        switch ((status || '').toLowerCase()) {
            case 'approved': return '#10b981';
            case 'rejected': return '#ef4444';
            case 'pending': return '#8b5cf6'; // Purple for permission requests
            default: return '#6b7280';
        }
    };

    const statusColor = getStatusBadgeColor(permissionDetails?.status);

    return `
    <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;background:#f9fafb;padding:20px">
      <div style="max-width:700px;margin:0 auto">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:30px">
          <h1 style="margin:0;font-size:28px;color:#7c3aed;font-weight:700">2-Hour Permission Request</h1>
          <p style="margin:8px 0 0 0;color:#6b7280;font-size:14px">A new permission request requires your attention</p>
        </div>

        <!-- Main Content Box -->
        <div style="background:#fff;border-radius:12px;padding:30px;margin-bottom:20px;border:2px solid #e9d5ff">
          
          <!-- Employee Info Section -->
          <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e5e7eb">
            <h3 style="margin:0 0 16px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Employee Information</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:0">
              <tr>
                <td width="50%" style="padding-right:10px;vertical-align:top">
                  <div style="padding:12px;background:#faf5ff;border-radius:8px;border-left:4px solid #8b5cf6">
                    <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Employee Name</p>
                    <p style="margin:0;font-size:16px;color:#0f172a;font-weight:700">${permissionDetails?.employeeName || 'N/A'}</p>
                  </div>
                </td>
                <td width="50%" style="padding-left:10px;vertical-align:top">
                  <div style="padding:12px;background:#faf5ff;border-radius:8px;border-left:4px solid #7c3aed">
                    <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Employee ID</p>
                    <p style="margin:0;font-size:16px;color:#0f172a;font-weight:700">${permissionDetails?.employeeId || 'N/A'}</p>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Status Section -->
          <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e5e7eb">
            <h3 style="margin:0 0 16px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Request Status</h3>
            <div style="padding:16px;background:#faf5ff;border-radius:8px;border-left:4px solid ${statusColor}">
              <div style="display:inline-block;padding:6px 16px;background:${statusColor};color:#fff;border-radius:20px;font-weight:600;font-size:14px;text-transform:uppercase">
                ${permissionDetails?.status || 'Pending'}
              </div>
            </div>
          </div>

          <!-- Reason Section -->
          <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e5e7eb">
            <h3 style="margin:0 0 16px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Reason for Permission</h3>
            <div style="padding:16px;background:#f9fafb;border-radius:8px;border-left:4px solid #8b5cf6">
              <p style="margin:0;color:#374151;font-size:14px;line-height:1.6">${permissionDetails?.reason || 'No reason provided'}</p>
            </div>
          </div>

          <!-- Permission Details Grid -->
          <div style="margin-bottom:20px">
            <h3 style="margin:0 0 16px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280">Permission Details</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:0">
              <tr>
                <td width="50%" style="padding-right:8px;padding-bottom:16px;vertical-align:top">
                  <div style="padding:14px;background:#faf5ff;border-radius:8px">
                    <p style="margin:0 0 6px 0;font-size:12px;color:#6b7280;font-weight:600">Permission Date</p>
                    <p style="margin:0;font-size:15px;color:#0f172a;font-weight:600">${permissionDetails?.permissionDate ? new Date(permissionDetails.permissionDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</p>
                  </div>
                </td>
                <td width="50%" style="padding-left:8px;padding-bottom:16px;vertical-align:top">
                  <div style="padding:14px;background:#faf5ff;border-radius:8px">
                    <p style="margin:0 0 6px 0;font-size:12px;color:#6b7280;font-weight:600">Duration</p>
                    <p style="margin:0;font-size:15px;color:#0f172a;font-weight:600">${String(permissionDetails?.duration || '0')} Hour(s)</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="vertical-align:top">
                  <div style="padding:14px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b">
                    <p style="margin:0 0 6px 0;font-size:12px;color:#92400e;font-weight:600">Monthly Usage Info</p>
                    <p style="margin:0;font-size:13px;color:#78350f">This request is part of the employee's 2-hour monthly permission allowance.</p>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center;color:#6b7280;font-size:12px;padding:20px;border-top:1px solid #e5e7eb">
          <p style="margin:0">Request ID: <strong>${permissionDetails?.id || 'N/A'}</strong></p>
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

const permissionSchema = z.object({
    permissionDate: z.string(),
    duration: z.number().min(1).max(2), // 1 or 2 hours
    reason: z.string(),
    status: z.string().optional()
});

// Create a new permission request
router.post('/', async (req: AuthRequest, res) => {
    try {
        console.log('POST /api/permission-requests - body:', req.body);

        const data = permissionSchema.parse(req.body);
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
            console.error('Error fetching employee:', e);
        }

        if (!employeeId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check monthly usage
        const permissionDate = new Date(data.permissionDate);
        const month = permissionDate.getMonth() + 1;
        const year = permissionDate.getFullYear();

        try {
            const usage = await dbStorage.getPermissionUsage(employeeId, month, year);
            const totalUsed = usage?.totalHoursUsed || 0;
            const remaining = 2 - totalUsed; // 2 hours monthly limit

            console.log(`[PERMISSION] Employee: ${employeeId}, Month: ${month}/${year}, Used: ${totalUsed}, Remaining: ${remaining}, Requested: ${data.duration}`);

            if (remaining < data.duration) {
                return res.status(400).json({
                    message: `Monthly limit exceeded. You have ${remaining} hour(s) remaining this month but requested ${data.duration} hour(s).`,
                    remaining,
                    requested: data.duration,
                    totalUsed
                });
            }
        } catch (err) {
            console.error('Error checking permission usage:', err);
            return res.status(500).json({ message: 'Failed to validate permission usage' });
        }

        // Create permission request
        const permissionRequest = await dbStorage.createPermissionRequest({
            employeeId,
            permissionDate: new Date(data.permissionDate),
            duration: data.duration,
            reason: data.reason,
            status: data.status || 'pending',
        } as any);

        // Add employeeName for email template
        if (employeeName) {
            (permissionRequest as any).employeeName = employeeName;
        }

        // Send email notifications
        try {
            const allEmployees = await dbStorage.getEmployees();
            const managers = allEmployees.filter((e: any) => {
                const role = (e.role || '').toLowerCase();
                return role.includes('manager') || role.includes('hr') || role.includes('admin');
            });

            console.log(`[PERMISSION-EMAIL] Found ${managers.length} managers/HR staff to notify`);

            // Create in-app notification
            const manager = managers[0];
            if (manager) {
                try {
                    const managerIdToNotify = manager.userId || manager.id;
                    await dbStorage.createNotification({
                        notificationType: 'permission_request',
                        referenceId: permissionRequest.id,
                        managerId: managerIdToNotify,
                        employeeId: permissionRequest.employeeId,
                        payload: { createdAt: new Date().toISOString() }
                    });
                    console.log('[PERMISSION-EMAIL] Notification created successfully');
                } catch (notifyErr) {
                    console.error('[PERMISSION-EMAIL] Failed to create notification:', notifyErr);
                }
            }

            // Prepare email recipients
            const rawRecipients = process.env.LEAVE_NOTIFICATION_EMAILS || '';
            let recipients = rawRecipients.split(',').map(s => s.trim()).filter(Boolean);

            if (recipients.length === 0) {
                recipients = ['karthik.s@progencislabs.com', 'digitalsales@progenicslabs.com', 'pavithra.rk@progenicslabs.com', 'swapnil@progenicslabs.com', 'arunapriya@progenicslabs.com'];
                console.log('[PERMISSION-EMAIL] Using default notification recipients');
            }

            // Add manager emails
            for (const mgr of managers) {
                if (mgr.email && !recipients.includes(mgr.email)) {
                    recipients.push(mgr.email);
                }
            }

            console.log('[PERMISSION-EMAIL] Total recipients:', recipients.length);

            if (recipients.length > 0) {
                const htmlBody = buildPermissionRequestEmailHtml(permissionRequest);

                const sendPromises = recipients.map((to) => {
                    return sendMail({
                        to,
                        subject: 'New 2-Hour Permission Request Awaiting Approval',
                        text: `A new permission request (${permissionRequest.id}) needs your approval.`,
                        html: htmlBody
                    })
                        .then((result: any) => {
                            console.log('[PERMISSION-EMAIL] Email sent successfully to:', to);
                            return { to, ok: true as const, result };
                        })
                        .catch((err: any) => {
                            console.error('[PERMISSION-EMAIL] Email send failed for:', to, err);
                            return { to, ok: false as const, err };
                        });
                });

                const settled = await Promise.all(sendPromises);
                for (const r of settled) {
                    if (r.ok) {
                        const previewUrl = r.result?.previewUrl || r.result?.info?.previewUrl;
                        if (previewUrl) {
                            (permissionRequest as any).previewUrls = (permissionRequest as any).previewUrls || [];
                            (permissionRequest as any).previewUrls.push(previewUrl);
                            console.log('[PERMISSION-EMAIL] Preview URL:', previewUrl);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[PERMISSION-EMAIL] Failed to send notifications:', err);
        }

        res.status(201).json({ message: 'Permission request submitted successfully', data: permissionRequest });
    } catch (error) {
        console.error('Permission request error:', error);
        res.status(400).json({ message: 'Failed to submit permission request', error });
    }
});

// Get permission requests for current user
router.get('/', async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const emp = await dbStorage.getEmployeeByUserId(userId).catch(() => null);
        if (!emp) return res.json({ items: [], total: 0 });

        const permissions = await dbStorage.getPermissionRequests(emp.employeeId);
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch permission requests', error });
    }
});

// Get permission usage for current month
router.get('/usage', async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const emp = await dbStorage.getEmployeeByUserId(userId).catch(() => null);
        if (!emp) return res.json({ totalAllowance: 2, used: 0, remaining: 2 });

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const usage = await dbStorage.getPermissionUsage(emp.employeeId, month, year);
        const totalUsed = usage?.totalHoursUsed || 0;

        res.json({
            totalAllowance: 2,
            used: totalUsed,
            remaining: 2 - totalUsed,
            month,
            year
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch permission usage', error });
    }
});

// Update permission request status
router.patch('/:id/status', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const permissionRequest = await dbStorage.updatePermissionRequestStatus(id, status, userId);

        // If approved, update the monthly usage
        if (status === 'approved') {
            const permDate = new Date(permissionRequest.permissionDate);
            const month = permDate.getMonth() + 1;
            const year = permDate.getFullYear();

            await dbStorage.updatePermissionUsage(
                permissionRequest.employeeId,
                month,
                year,
                permissionRequest.duration
            );
        }

        res.json({ message: 'Permission request updated successfully', data: permissionRequest });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update permission request', error });
    }
});

export default router;
