import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format as formatDate } from 'date-fns';

// Types for report data
export interface AttendanceRecord {
  date: string;
  employeeId: string;
  employeeName: string;
  department: string;
  status: 'present' | 'absent' | 'late';
  totalHours: number | null;
}

export interface PayrollRecord {
  month: number;
  year: number;
  employeeId: string;
  employeeName: string;
  department: string;
  basicSalary: string;
  grossSalary: string;
  netSalary: string;
  status: string;
}

export interface EmployeeReport {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  joinDate: string;
  status: string;
}

export const generateReport = (
  data: AttendanceRecord[] | PayrollRecord[] | EmployeeReport[],
  reportType: string,
  dateRange: string,
  department: string
) => {
  const doc = new jsPDF();
  const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
  const dateStr = formatDate(new Date(), 'yyyy-MM-dd');

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 20);

  // Add metadata
  doc.setFontSize(11);
  doc.text(`Date Range: ${dateRange}`, 14, 30);
  doc.text(`Department: ${department || 'All Departments'}`, 14, 37);
  doc.text(`Generated on: ${dateStr}`, 14, 44);

  // Configure columns based on report type
  let columns: { header: string; dataKey: string }[] = [];
  let rows: Record<string, any>[] = [];

  switch (reportType) {
    case 'attendance': {
      columns = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Employee ID', dataKey: 'employeeId' },
        { header: 'Name', dataKey: 'employeeName' },
        { header: 'Department', dataKey: 'department' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Hours', dataKey: 'hours' }
      ];

      const attendanceData = data as AttendanceRecord[];
      rows = attendanceData.map(record => ({
        date: formatDate(new Date(record.date), 'yyyy-MM-dd'),
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department,
        status: record.status,
        hours: record.totalHours ? Number(record.totalHours).toFixed(2) : '-'
      }));
      break;
    }

    case 'payroll': {
      columns = [
        { header: 'Period', dataKey: 'period' },
        { header: 'Employee ID', dataKey: 'employeeId' },
        { header: 'Name', dataKey: 'employeeName' },
        { header: 'Department', dataKey: 'department' },
        { header: 'Basic', dataKey: 'basic' },
        { header: 'Gross', dataKey: 'gross' },
        { header: 'Net', dataKey: 'net' },
        { header: 'Status', dataKey: 'status' }
      ];

      const payrollData = data as PayrollRecord[];
      rows = payrollData.map(record => ({
        period: `${record.month}/${record.year}`,
        employeeId: record.employeeId,
        employeeName: record.employeeName || (record as any).name,
        department: record.department,
        basic: parseFloat(record.basicSalary).toFixed(2),
        gross: parseFloat(record.grossSalary).toFixed(2),
        net: parseFloat(record.netSalary).toFixed(2),
        status: record.status
      }));
      break;
    }

    case 'employee':
      columns = [
        { header: 'Employee ID', dataKey: 'employeeId' },
        { header: 'Name', dataKey: 'employeeName' },
        { header: 'Department', dataKey: 'department' },
        { header: 'Role', dataKey: 'role' },
        { header: 'Join Date', dataKey: 'joinDate' },
        { header: 'Status', dataKey: 'status' }
      ];

      rows = (data as EmployeeReport[]).map(record => ({
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department || 'Not Assigned',
        role: record.role || 'Not Assigned',
        joinDate: record.joinDate ? formatDate(new Date(record.joinDate), 'yyyy-MM-dd') : '',
        status: record.status || 'Active'
      }));
      break;
  }

  // Add table (manual renderer used because jspdf-autotable may not be available in the runtime)
  const startX = 14;
  let y = 50;
  const rowHeight = 8;
  const colWidth = (doc.internal.pageSize.width - startX * 2) / Math.max(columns.length, 1);

  // headers
  doc.setFontSize(9);
  doc.setFont(undefined as any, 'bold' as any);
  columns.forEach((col, i) => {
    const x = startX + i * colWidth;
    doc.text(String(col.header), x + 2, y);
  });
  doc.setFont(undefined as any, 'normal' as any);
  y += rowHeight;

  // rows (simple wrapping: new page when needed)
  rows.forEach((row) => {
    if (y + rowHeight > doc.internal.pageSize.height - 20) {
      doc.addPage();
      y = 20;
    }
    columns.forEach((col, i) => {
      const x = startX + i * colWidth;
      const cell = row[col.dataKey as keyof typeof row];
      doc.text(String(cell ?? ''), x + 2, y);
    });
    y += rowHeight;
  });

  // Add summary (use current y position from table rendering)
  const pageHeight = doc.internal.pageSize.height;
  let summaryY = y + 20;
  if (summaryY >= pageHeight - 40) {
    doc.addPage();
    summaryY = 20;
  }

  doc.setFontSize(12);
  doc.text('Summary', 14, summaryY);
  doc.setFontSize(10);

  switch (reportType) {
    case 'attendance': {
      const attendanceData = data as AttendanceRecord[];
      const presentCount = attendanceData.filter(r => r.status === 'present').length;
      const absentCount = attendanceData.filter(r => r.status === 'absent').length;
      const lateCount = attendanceData.filter(r => r.status === 'late').length;

      doc.text(`Total Records: ${attendanceData.length}`, 14, summaryY + 10);
      doc.text(`Present: ${presentCount}`, 14, summaryY + 20);
      doc.text(`Absent: ${absentCount}`, 14, summaryY + 30);
      doc.text(`Late: ${lateCount}`, 14, summaryY + 40);
      break;
    }

    case 'payroll': {
      const payrollData = data as PayrollRecord[];
      const totalGross = payrollData.reduce((sum, r) =>
        sum + parseFloat(r.grossSalary), 0);
      const totalNet = payrollData.reduce((sum, r) =>
        sum + parseFloat(r.netSalary), 0);

      doc.text(`Total Records: ${payrollData.length}`, 14, summaryY + 10);
      doc.text(`Total Gross: ₹${totalGross.toFixed(2)}`, 14, summaryY + 20);
      doc.text(`Total Net: ₹${totalNet.toFixed(2)}`, 14, summaryY + 30);
      break;
    }

    case 'employee':
      const deptCount = data.reduce((acc: any, r: any) => {
        acc[r.department] = (acc[r.department] || 0) + 1;
        return acc;
      }, {});

      doc.text(`Total Employees: ${data.length}`, 14, summaryY + 10);
      Object.entries(deptCount).forEach(([dept, count], i) => {
        doc.text(`${dept}: ${count}`, 14, summaryY + 20 + (i * 10));
      });
      break;
  }

  return doc;
};

export const exportReport = (
  data: AttendanceRecord[] | PayrollRecord[] | EmployeeReport[],
  reportType: string,
  dateRange: string,
  department: string,
  format: string
) => {
  console.log('exportReport called', { reportType, format, length: Array.isArray(data) ? data.length : 'unknown' });

  const today = new Date();
  const filename = `${reportType}-report-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  switch (format.toLowerCase()) {
    case 'pdf': {
      const doc = generateReport(data, reportType, dateRange, department);
      doc.save(`${filename}.pdf`);
      break;
    }

    case 'csv': {
      let csvContent = '';

      // Generate CSV headers
      switch (reportType) {
        case 'attendance': {
          csvContent = 'Date,Employee ID,Name,Department,Status,Hours\n';
          const attendanceData = data as AttendanceRecord[];
          attendanceData.forEach(r => {
            const attDate = new Date(r.date);
            csvContent += `${attDate.getFullYear()}-${String(attDate.getMonth() + 1).padStart(2, '0')}-${String(attDate.getDate()).padStart(2, '0')},${r.employeeId},` +
              `"${r.employeeName}",${r.department},${r.status},` +
              `${r.totalHours ? Number(r.totalHours).toFixed(2) : '-'}\n`;
          });
          break;
        }

        case 'payroll': {
          csvContent = 'Period,Employee ID,Name,Department,Basic,Gross,Net,Status\n';
          const payrollData = data as PayrollRecord[];
          payrollData.forEach(r => {
            const name = r.employeeName || (r as any).name || '';
            csvContent += `${r.month}/${r.year},${r.employeeId},"${name}",${r.department},` +
              `${r.basicSalary},${r.grossSalary},${r.netSalary},${r.status}\n`;
          });
          break;
        }

        case 'employee': {
          csvContent = 'Employee ID,Name,Department,Role,Join Date,Status\n';
          const employeeData = data as EmployeeReport[];
          employeeData.forEach(r => {
            const joinDate = new Date(r.joinDate);
            const formattedDate = formatDate(joinDate, 'yyyy-MM-dd');
            csvContent += `${r.employeeId},"${r.employeeName}",${r.department},${r.role},` +
              `${formattedDate},${r.status}\n`;
          });
          break;
        }
      }

      // Create a Blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      break;
    }
    case 'excel': {
      // Build worksheet data depending on report type
      let sheetData: Array<Array<string | number>> = [];
      switch (reportType) {
        case 'attendance': {
          sheetData.push(['Date', 'Employee ID', 'Name', 'Department', 'Status', 'Hours']);
          (data as AttendanceRecord[]).forEach(r => {
            sheetData.push([
              formatDate(new Date(r.date), 'yyyy-MM-dd'),
              r.employeeId,
              r.employeeName,
              r.department,
              r.status,
              r.totalHours ? Number(r.totalHours).toFixed(2) : '-'
            ]);
          });
          break;
        }
        case 'payroll': {
          sheetData.push(['Period', 'Employee ID', 'Name', 'Department', 'Basic', 'Gross', 'Net', 'Status']);
          (data as PayrollRecord[]).forEach(r => {
            sheetData.push([
              `${r.month}/${r.year}`,
              r.employeeId,
              r.employeeName,
              r.department,
              r.basicSalary,
              r.grossSalary,
              r.netSalary,
              r.status
            ]);
          });
          break;
        }
        case 'employee': {
          sheetData.push(['Employee ID', 'Name', 'Department', 'Role', 'Join Date', 'Status']);
          (data as EmployeeReport[]).forEach(r => {
            sheetData.push([
              r.employeeId,
              r.employeeName,
              r.department,
              r.role,
              formatDate(new Date(r.joinDate), 'yyyy-MM-dd'),
              r.status
            ]);
          });
          break;
        }
      }

      console.log('Prepared sheetData rows:', sheetData.length);
      if (sheetData.length <= 1) { // only header or empty
        console.warn('sheetData is empty or contains only header. Aborting Excel export.', { reportType, sheetData });
        // fallback to CSV to at least provide something
        exportReport(data, reportType, dateRange, department, 'csv');
        break;
      }

      // lazy-import xlsx to avoid SSR/bundling issues
      // @ts-ignore
      import('xlsx').then((XLSX) => {
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }).catch(err => {
        // fallback to CSV if xlsx import fails
        console.error('XLSX export failed, falling back to CSV', err);
        exportReport(data, reportType, dateRange, department, 'csv');
      });

      break;
    }
  }
};
