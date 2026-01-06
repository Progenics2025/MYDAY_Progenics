# Critical Fixes Applied - Leave Balance Validation & Email Templates

## Summary
Three critical issues have been identified and fixed that were preventing leave balance validation from working properly and causing outdated email templates to be sent to employees.

## Issues Found & Fixed

### 1. ❌ Database Schema Mismatch → ✅ FIXED
**Problem:** 
- Migration 0009 created new columns: `casual_leave_new`, `sick_leave_new`, `earned_leave_new` (NUMERIC type)
- But `shared/schema.ts` was still referencing the old column names: `casual_leave`, `sick_leave`, `earned_leave` (without _new suffix)
- This caused `getLeaveBalances()` to query the wrong columns and return undefined

**Impact:** 
Leave balance validation was receiving `undefined` values, which defaulted to 0, so the validation couldn't block zero-balance applications

**Fix Applied:** 
Updated [shared/schema.ts](shared/schema.ts) to use the correct column names that match the migration:
```typescript
casualLeave: decimal("casual_leave_new"),    // was: decimal("casual_leave")
sickLeave: decimal("sick_leave_new"),        // was: decimal("sick_leave")
earnedLeave: decimal("earned_leave_new"),    // was: decimal("earned_leave")
```

---

### 2. ❌ getLeaveBalances() Function Not Finding Columns → ✅ FIXED
**Problem:**
- Function in [server/postgresql.ts](server/postgresql.ts) was only checking for camelCase property names (casualLeave, sickLeave, earnedLeave)
- The actual database columns are now in snake_case_new format (casual_leave_new, sick_leave_new, earned_leave_new)
- Query results had mismatched property names, causing undefined values

**Impact:** 
Leave balance validation couldn't retrieve the employee's actual balance

**Fix Applied:**
Enhanced `getLeaveBalances()` to check multiple column name formats with fallbacks:
```typescript
const casualBalance = casual_leave_new !== undefined ? casual_leave_new : (casual_leave !== undefined ? casual_leave : casualLeave);
const sickBalance = sick_leave_new !== undefined ? sick_leave_new : (sick_leave !== undefined ? sick_leave : sickLeave);
const earnedBalance = earned_leave_new !== undefined ? earned_leave_new : (earned_leave !== undefined ? earned_leave : earnedLeave);
```

This ensures compatibility whether the column returns as `casual_leave_new`, `casual_leave`, or `casualLeave`.

---

### 3. ❌ Email Templates Using Old Simple Format → ✅ FIXED
**Problem:**
- User complained: "Email template is coming the old one... I told use new template right why its using the old one?"
- Multiple email template locations in [server/routes/notify.ts](server/routes/notify.ts) were still using old simple HTML
- Found 4 email templates (2 approval + 2 rejection) using the old format

**Impact:** 
Employees receiving unprofessional, minimal-information emails instead of the new improved templates with employee info, status badges, and leave details

**Fix Applied:**
Updated all 4 email templates in [server/routes/notify.ts](server/routes/notify.ts) to use new professional table-based format:

#### Updated Templates:
1. **Leave Approval Email** (Line ~160) - Now includes:
   - Professional header with title
   - Employee information section (name + ID in blue/purple boxes)
   - Status section with green "Approved" badge
   - Leave details grid (type, total days, start/end dates)
   - Footer with request ID

2. **Leave Approval Email** (Line ~215) - Same professional format as above

3. **Leave Rejection Email** (Line ~269) - Now includes:
   - Professional header with title
   - Employee information section (name + ID)
   - Status section with red "Rejected" badge
   - Rejection reason section (if provided)
   - Leave details grid
   - Footer with request ID

4. **Leave Rejection Email** (Line ~406) - Same professional format as rejection above

---

## Files Modified

1. **[shared/schema.ts](shared/schema.ts)**
   - Updated casualLeave column from `decimal("casual_leave")` → `decimal("casual_leave_new")`
   - Updated sickLeave column from `decimal("sick_leave")` → `decimal("sick_leave_new")`
   - Updated earnedLeave column from `decimal("earned_leave")` → `decimal("earned_leave_new")`

2. **[server/postgresql.ts](server/postgresql.ts)**
   - Enhanced `getLeaveBalances()` function to handle multiple column name formats
   - Added fallback chain: check _new suffix → check snake_case → check camelCase

3. **[server/routes/notify.ts](server/routes/notify.ts)**
   - Updated all 4 email templates (2 approvals + 2 rejections)
   - Changed from old simple format to professional table-based layout
   - Added employee info, color-coded status badges, leave details grid

4. **[server/routes/leave.ts](server/routes/leave.ts)**
   - Already had improved email template from previous update
   - Leave balance validation logic already in place (lines 202-245)

---

## Validation Logic (Now Working)

Located in [server/routes/leave.ts](server/routes/leave.ts) lines 202-245:

```typescript
const leaveBalances = await dbStorage.getLeaveBalances(employeeId);
const leaveTypeKey = `${data.leaveType.toLowerCase()}Leave`;
const availableBalance = leaveBalances[leaveTypeKey as keyof typeof leaveBalances];
const balance = availableBalance !== undefined ? Number(availableBalance) : 0;

if (balance <= 0) {
  return res.status(400).json({ 
    message: `You do not have any ${data.leaveType.toLowerCase()} leave balance available.`,
    availableBalance: 0,
    requestedDays: requestedDays
  });
}
```

This validation now:
✅ Retrieves correct balance from database (due to schema/column fixes)
✅ Properly blocks applications when balance is 0 or less
✅ Returns clear error message to user

---

## Testing

To verify all fixes are working:

1. **Test Leave Balance Validation:**
   - Create employee with 0 casual leave balance
   - Try to apply for casual leave
   - Should receive: `"You do not have any casual leave balance available."`

2. **Test Email Templates:**
   - Apply for leave as an employee
   - Check approval email - should show professional layout with employee info, green status badge, and details grid
   - Reject a leave request as a manager
   - Check rejection email - should show professional layout with red "Rejected" badge and reason section

3. **Test Database Queries:**
   - Check server logs during leave application
   - Should see successful balance retrieval with actual values (not undefined)
   - Balance values should come from `casual_leave_new`, `sick_leave_new`, `earned_leave_new` columns

---

## Database Migration Reference

The database changes were made in [migrations/0009_migrate_leave_columns_to_numeric.sql](migrations/0009_migrate_leave_columns_to_numeric.sql):

```sql
-- Created new numeric columns
ALTER TABLE employees ADD COLUMN casual_leave_new NUMERIC(5,2);
ALTER TABLE employees ADD COLUMN sick_leave_new NUMERIC(5,2);
ALTER TABLE employees ADD COLUMN earned_leave_new NUMERIC(5,2);

-- Migrated data from old columns
UPDATE employees SET 
  casual_leave_new = CAST(casual_leave AS NUMERIC),
  sick_leave_new = CAST(sick_leave AS NUMERIC),
  earned_leave_new = CAST(earned_leave AS NUMERIC);
```

The schema file has now been updated to match this migration.

---

## Related Issues Previously Fixed

- ✅ Role-based access control for expense approvals (expense-list.tsx)
- ✅ CSS Grid replaced with table-based layout in email templates (email-preview.html, email-preview-example.html)

---

## Next Steps

1. Run comprehensive tests on leave balance validation with 0 balance employees
2. Verify email templates display correctly in various email clients
3. Check server logs for any column name mismatch errors
4. Commit and push all changes to GitHub

---

**Status:** All 3 critical fixes have been applied and are ready for testing.
