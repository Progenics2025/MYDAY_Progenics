# Reject Button - Quick Reference

## What Was Fixed

### Before ❌
```
Click Reject → Dialog opens → Submit → Status stays "Pending" → Buttons reappear on refresh
```

### After ✅
```
Click Reject → Dialog opens → Submit → Status changes to "Rejected" → Buttons hidden → Persists on refresh
```

## Root Cause

The old code created a NEW notification each time, which could mismatch with the leave request ID, causing the status update to fail silently.

## Solution

**Added new direct endpoint** that rejects the leave request without creating unnecessary notifications.

## Files Changed

1. **`/server/routes/notify.ts`**
   - Added: `POST /api/notify/leave-requests/:leaveRequestId/reject-directly`
   - Kept: Old endpoint for backward compatibility

2. **`/client/src/components/leave/leave-requests-list.tsx`**
   - Updated reject flow to use new endpoint
   - Added `await refetch()` for proper data refresh
   - Removed unnecessary notification creation

## Testing Checklist

- [ ] Click Reject button → Dialog appears
- [ ] Enter rejection reason → Text area accepts input
- [ ] Click "Reject Request" → Success toast appears
- [ ] Request disappears from list (or shows "Rejected" badge)
- [ ] Approve/Reject buttons are gone
- [ ] Refresh page → Status still "Rejected"
- [ ] Employee leave balance unchanged
- [ ] Check database: `SELECT status FROM leave_requests WHERE id = '...';` returns 'rejected'

## Key Differences from Previous Version

| Feature | Old | New |
|---------|-----|-----|
| Endpoint | `/reject` (notification-based) | `/reject-directly` (leave-request-based) |
| API Calls | 2 (create notification + reject) | 1 (direct reject) |
| ID Risk | High (notification→leave mapping) | None (direct ID) |
| Data Refresh | Fire and forget | Awaited |

## Console Logs to Watch For

**Frontend Success**:
```
[LEAVE] Action: reject, Request ID: xxx
[LEAVE] Starting reject flow for request: xxx, reason: yyy
[LEAVE] Leave request rejected successfully: {leaveRequest: ...}
[LEAVE] Data refreshed after reject action
```

**Backend Success**:
```
[REJECT] Processing direct rejection for leave request: xxx
[UPDATE_STATUS] Leave request xxx, transitioning from pending to rejected
[UPDATE_STATUS] Leave request rejected - NO leave balance deducted
[REJECT] Leave request updated: xxx, status: rejected
```

## If It's Still Not Working

1. **Check browser console** for errors (F12)
2. **Check network tab** for failed API call
3. **Check server logs** for backend errors
4. **Check database** if status actually updated:
   ```sql
   SELECT status FROM leave_requests WHERE id = '<id>';
   ```

## Live Test

1. Open Leave Requests Dashboard
2. Find a pending request
3. Click "Reject" button
4. Enter reason (required field)
5. Click "Reject Request"
6. Verify: Status changes, buttons disappear, success notification shows
7. Refresh page
8. Verify: Status still "Rejected", buttons still hidden

That's it! It should work now.
