# Reject Button Functionality - Fixes & Implementation

## Overview
The reject button functionality for leave requests has been fixed and enhanced with proper API endpoints, error handling, and logging.

## Issues Fixed

### 1. **JSONB Payload Handling in Database**
**Issue**: The original SQL was using `JSONB_SET` which fails if the payload field is NULL.
```typescript
// BEFORE (broken)
payload = JSONB_SET(payload, '{rejectionReason}', $3)

// AFTER (fixed)
payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object('rejectionReason', $3)
```
**Impact**: Rejects now properly store the rejection reason in the database.

### 2. **Improved Error Handling**
Added comprehensive error handling and logging throughout the stack:
- **Frontend**: Better error response parsing
- **Backend**: Detailed console logging for debugging
- **Toast notifications**: More informative user feedback

### 3. **Leave Balance Protection**
Confirmed that:
- ✅ When status is 'APPROVED' → Leave balance is DEDUCTED
- ✅ When status is 'REJECTED' → Leave balance is NOT deducted
- ✅ Proper transaction handling to prevent partial updates

## Files Modified

### Backend Files

#### 1. `/server/postgresql.ts`
**Changes**:
- Fixed `rejectNotification()` method to handle null payloads
- Added console logging to `updateLeaveRequestStatus()` to track:
  - Status transitions
  - Leave balance deductions
  - Rejection confirmations

```typescript
// Old SQL (broken)
payload = JSONB_SET(payload, '{rejectionReason}', $3)

// New SQL (fixed)
payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object('rejectionReason', $3)
```

#### 2. `/server/routes/notify.ts`
**Changes**:
- Enhanced reject endpoint with detailed logging
- Better error responses with error messages
- Validation before processing
- Detailed console output for debugging

```typescript
router.post('/leave-requests/:notificationId/reject', authenticateToken, async (req, res) => {
  // Now includes:
  // - Parameter validation with logging
  // - Better error messages
  // - Transaction handling
  // - Detailed response with both notification and leave request data
})
```

### Frontend Files

#### 1. `/client/src/components/leave/leave-requests-list.tsx`
**Changes**:
- Added console logging to track user actions
- Improved error handling in reject flow
- Better error messages for users
- Modal state management fixes

## API Endpoints

### POST `/api/notify/leave-requests/:notificationId/reject`
**Purpose**: Reject a leave request

**Request**:
```json
{
  "reason": "Reason for rejection"
}
```

**Response** (Success - 200):
```json
{
  "message": "Leave rejected successfully",
  "notification": { /* notification object */ },
  "leaveRequest": { /* leave request object with status: 'rejected' */ }
}
```

**Response** (Error - 500):
```json
{
  "message": "Failed to reject leave",
  "error": "Detailed error message"
}
```

## How to Test

### 1. **Frontend Testing**
```bash
# Check browser console for these logs when testing reject:
[LEAVE] Action: reject, Request ID: <request-id>
[LEAVE] Starting reject flow for request: <request-id>, reason: <reason>
[LEAVE] Notification created: <notification-id>
[LEAVE] Leave request rejected successfully
```

### 2. **Backend Testing**
```bash
# Check server console for these logs:
[REJECT] Processing rejection for notification: <notification-id>, reason: <reason>
[REJECT] Notification rejected successfully: <notification-id>
[REJECT] Leave request updated: <leave-request-id>, status: rejected
[UPDATE_STATUS] Leave request <id>, transitioning from pending to rejected
[UPDATE_STATUS] Leave request rejected - NO leave balance deducted
[UPDATE_STATUS] Leave request <id> status updated to rejected
```

### 3. **Database Verification**
```sql
-- Check leave request status
SELECT id, status, reason, start_date, end_date FROM leave_requests 
WHERE id = '<request-id>';

-- Check notification rejection reason
SELECT id, status, payload FROM notifications 
WHERE reference_id = '<request-id>';

-- Verify employee leave balance wasn't changed
SELECT employee_id, casual_leave, sick_leave, earned_leave 
FROM employees WHERE employee_id = '<employee-id>';
```

### 4. **Step-by-Step Testing**

1. **Login as Manager/Admin**
2. **Go to Leave Requests List**
3. **Find a pending leave request**
4. **Click Reject button**
5. **Enter rejection reason**
6. **Click "Reject Request"**
7. **Verify**:
   - Toast notification shows success
   - Leave request status changes to "Rejected"
   - Employee's leave balance is unchanged
   - Console shows proper logging

## Key Features

✅ **Proper Error Handling**: Detailed error messages help identify issues
✅ **Database Safety**: Transactions prevent partial updates
✅ **Leave Balance Protection**: Rejections never deduct from employee balance
✅ **Audit Trail**: Logging tracks who rejected and when
✅ **User Feedback**: Clear success/error messages
✅ **Modal Validation**: Reason is required before rejection

## Troubleshooting

### Issue: "Reject button doesn't work"
**Solution**:
1. Check browser console for errors
2. Check server logs for `[REJECT]` messages
3. Verify you're logged in as manager/admin
4. Verify the leave request is in "pending" status
5. Ensure manager exists in the system

### Issue: "Failed to reject leave" error
**Check**:
1. Is the notification ID correct? (Check browser network tab)
2. Is the token valid? (Check Authorization header)
3. Are there database errors? (Check server logs)

### Issue: Leave balance was deducted after rejection
**This should NOT happen** - if it does:
1. Check the status in database: `SELECT status FROM leave_requests WHERE id = '...'`
2. Check logs for `[UPDATE_STATUS]` messages
3. Verify the updateLeaveRequestStatus function is working correctly

## Database Schema Notes

The rejection reason is stored in the `notifications.payload` JSONB field:
```json
{
  "createdAt": "2024-01-02T...",
  "rejectionReason": "Employee already has approved leave on these dates"
}
```

The `leave_requests.status` field should be one of:
- `pending` - Initial state
- `approved` - Manager approved (leave balance deducted)
- `rejected` - Manager rejected (leave balance NOT deducted)

## Summary

The reject functionality is now fully working with:
- ✅ Proper API endpoints
- ✅ Safe database operations with transactions
- ✅ Comprehensive error handling
- ✅ Detailed logging for debugging
- ✅ No unintended leave balance changes
- ✅ Clear user feedback
