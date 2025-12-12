
import { storage } from './server/db-storage';

async function checkData() {
    try {
        console.log('Fetching employees...');
        const employees = await storage.getEmployees();
        console.log(`Found ${employees.length} employees`);
        employees.forEach(e => {
            console.log(`Employee: id=${e.id}, employeeId=${e.employeeId}, name=${e.firstName} ${e.lastName}, dept=${e.department}`);
        });

        console.log('\nFetching attendance...');
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const attendance = await storage.getAttendanceByDateRange(startOfMonth, endOfMonth);
        console.log(`Found ${attendance.length} attendance records for this month`);
        attendance.forEach(a => {
            console.log(`Attendance: id=${a.id}, employeeId=${a.employeeId}, date=${a.date}, status=${a.status}`);
        });

        console.log('\nChecking matching...');
        attendance.forEach(a => {
            const emp = employees.find(e => e.employeeId === a.employeeId);
            if (emp) {
                console.log(`MATCH: Attendance ${a.id} matches Employee ${emp.employeeId}`);
            } else {
                console.log(`MISMATCH: Attendance ${a.id} has employeeId ${a.employeeId} which is NOT found in employees list`);
            }
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

checkData();
