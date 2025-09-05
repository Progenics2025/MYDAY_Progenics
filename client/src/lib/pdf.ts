// Simple PDF generation utility
export function generatePayslipPDF(payrollData: any, employeeData: any) {
  // Create a simple HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Payslip - ${employeeData.firstName} ${employeeData.lastName}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .details { margin: 20px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 2px solid #333; padding-top: 10px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>PAYSLIP</h1>
            <h2>Period: ${payrollData.month}/${payrollData.year}</h2>
        </div>
        
        <div class="details">
            <h3>Employee Details</h3>
            <div class="row"><span>Name:</span><span>${employeeData.firstName} ${employeeData.lastName}</span></div>
            <div class="row"><span>Employee ID:</span><span>${employeeData.employeeId}</span></div>
            <div class="row"><span>Department:</span><span>${employeeData.department}</span></div>
            <div class="row"><span>Role:</span><span>${employeeData.role}</span></div>
            <div class="row"><span>PAN Number:</span><span>${employeeData.panNumber || 'N/A'}</span></div>
            <div class="row"><span>UAN (PF) Number:</span><span>${employeeData.uanNumber || 'N/A'}</span></div>
            <div class="row"><span>ESIC Number:</span><span>${employeeData.esicNumber || 'N/A'}</span></div>
        </div>
        
        <div class="details">
            <h3>Earnings</h3>
            <div class="row"><span>Basic Salary:</span><span>₹${parseFloat(payrollData.basicSalary).toFixed(2)}</span></div>
            <div class="row"><span>House Rent Allowance (HRA):</span><span>₹${parseFloat(payrollData.hra || '0').toFixed(2)}</span></div>
            <div class="row"><span>Transport Allowance:</span><span>₹${parseFloat(payrollData.transportAllowance || '0').toFixed(2)}</span></div>
            <div class="row"><span>Medical Allowance:</span><span>₹${parseFloat(payrollData.medicalAllowance || '0').toFixed(2)}</span></div>
            <div class="row"><span>Other Allowances:</span><span>₹${parseFloat(payrollData.otherAllowances || '0').toFixed(2)}</span></div>
            <div class="row"><span><strong>Gross Pay:</strong></span><span><strong>₹${parseFloat(payrollData.grossSalary).toFixed(2)}</strong></span></div>
        </div>
        
        <div class="details">
            <h3>Deductions</h3>
            <div class="row"><span>Provident Fund (PF - 12%):</span><span>₹${parseFloat(payrollData.providentFund || '0').toFixed(2)}</span></div>
            <div class="row"><span>Employee State Insurance (ESI - 0.75%):</span><span>₹${parseFloat(payrollData.esi || '0').toFixed(2)}</span></div>
            <div class="row"><span>Professional Tax:</span><span>₹${parseFloat(payrollData.professionalTax || '0').toFixed(2)}</span></div>
            <div class="row"><span>Income Tax (TDS):</span><span>₹${parseFloat(payrollData.incomeTax || '0').toFixed(2)}</span></div>
            <div class="row"><span>Other Deductions:</span><span>₹${parseFloat(payrollData.otherDeductions || '0').toFixed(2)}</span></div>
            <div class="row total"><span><strong>Net Pay:</strong></span><span><strong>₹${parseFloat(payrollData.netSalary).toFixed(2)}</strong></span></div>
        </div>
    </body>
    </html>
  `;

  // Open in new window for printing/saving
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    newWindow.print();
  }
}

export function downloadCSVReport(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
