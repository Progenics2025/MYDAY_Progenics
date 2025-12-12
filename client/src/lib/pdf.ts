// client/src/lib/pdf.ts

export async function createPayslipPDF(payrollData: any, employeeData: any): Promise<Uint8Array | null> {
  let pdfLib: any;
  try {
    pdfLib = await import('pdf-lib');
  } catch (err) {
    console.error('pdf-lib import failed', err);
    alert('Please install pdf-lib in the client: `npm install pdf-lib`');
    return null;
  }

  try {
    // Load template or create new
    const templatePath = encodeURI('/Progenics Catalog.pdf');
    const res = await fetch(templatePath);
    let pdfDoc;

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      pdfDoc = await pdfLib.PDFDocument.load(arrayBuffer);
    } else {
      pdfDoc = await pdfLib.PDFDocument.create();
      pdfDoc.addPage([595.28, 841.89]); // A4 size
    }

    const [page] = pdfDoc.getPages();
    const { width, height } = page.getSize();
    const { rgb, StandardFonts } = pdfLib;

    // Colors
    const darkBlue = rgb(0.10, 0.14, 0.49); // #1a237e
    const white = rgb(1, 1, 1);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const lightGreen = rgb(0.91, 0.96, 0.91); // #e8f5e9
    const lightRed = rgb(1, 0.92, 0.93); // #ffebee

    // Fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Helpers
    const drawText = (text: string, x: number, y: number, size: number = 10, options: any = {}) => {
      page.drawText(String(text || ''), {
        x,
        y,
        size,
        font: options.font || font,
        color: options.color || black,
        ...options
      });
    };

    const fmt = (v: any) => {
      const n = Number(v ?? 0);
      return isNaN(n) ? '0.00' : n.toFixed(2);
    };

    const formatMonth = (m: any) => {
      if (!m) return '';
      // If it's already a short name like "Nov" or "November", just uppercase it
      if (isNaN(Number(m))) return String(m).toUpperCase();

      // If it's a number like "11" or 11
      const monthNum = parseInt(String(m));
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        const date = new Date();
        date.setMonth(monthNum - 1);
        return date.toLocaleString('default', { month: 'short' }).toUpperCase();
      }
      return String(m).toUpperCase();
    };

    // --- Layout ---

    // Clear content area if using template (optional, but good safety)
    // Assuming header is top 150px, footer bottom 50px
    page.drawRectangle({
      x: 0,
      y: 50,
      width: width,
      height: height - 200,
      color: white,
    });

    let y = height - 140;
    const margin = 40;
    const contentWidth = width - (2 * margin);

    // 1. Title
    drawText('PAYSLIP', width / 2 - 30, y, 14, { font: boldFont });
    drawText(`${formatMonth(payrollData.month)} - ${payrollData.year}`, width - margin - 80, y, 12, { font: font });
    y -= 25;

    // 2. Employee Details Box (Dark Blue)
    const boxHeight = 90;
    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: contentWidth,
      height: boxHeight,
      color: darkBlue,
    });

    const leftColX = margin + 20;
    const rightColX = margin + contentWidth / 2 + 20;
    let textY = y - 20;
    const lineHeight = 18;

    // Left Column
    drawText('Employee Code:', leftColX, textY, 9, { color: white, font: boldFont });
    drawText(employeeData.employeeId || '-', leftColX + 80, textY, 9, { color: white });

    drawText('Name:', leftColX, textY - lineHeight, 9, { color: white, font: boldFont });
    drawText(`${employeeData.firstName} ${employeeData.lastName}`, leftColX + 80, textY - lineHeight, 9, { color: white });

    drawText('Designation:', leftColX, textY - lineHeight * 2, 9, { color: white, font: boldFont });
    drawText(employeeData.role || '-', leftColX + 80, textY - lineHeight * 2, 9, { color: white });

    drawText('Department:', leftColX, textY - lineHeight * 3, 9, { color: white, font: boldFont });
    drawText(employeeData.department || '-', leftColX + 80, textY - lineHeight * 3, 9, { color: white });

    // Right Column
    drawText('Joining Date:', rightColX, textY, 9, { color: white, font: boldFont });
    drawText(employeeData.joinDate ? new Date(employeeData.joinDate).toLocaleDateString() : '-', rightColX + 80, textY, 9, { color: white });

    drawText('PAN Number:', rightColX, textY - lineHeight, 9, { color: white, font: boldFont });
    drawText(employeeData.panNumber || '-', rightColX + 80, textY - lineHeight, 9, { color: white });

    drawText('City:', rightColX, textY - lineHeight * 2, 9, { color: white, font: boldFont });
    drawText(payrollData.city || employeeData.city || '-', rightColX + 80, textY - lineHeight * 2, 9, { color: white });

    drawText('State:', rightColX, textY - lineHeight * 3, 9, { color: white, font: boldFont });
    drawText(payrollData.state || employeeData.state || '-', rightColX + 80, textY - lineHeight * 3, 9, { color: white });

    y -= (boxHeight + 30);

    // 3. Payroll Days
    const daysY = y;
    const daysGap = contentWidth / 4;

    const drawDayStat = (label: string, value: string, x: number) => {
      drawText(label, x, daysY, 9, { font: boldFont });
      drawText(value, x + 60, daysY, 9);
    };

    drawDayStat('Payroll Days:', String(payrollData.totalDays || '30'), margin);
    drawDayStat('Days Paid:', String(payrollData.daysPaid || '30'), margin + 120);
    drawDayStat('Arrear Days:', String(payrollData.arrearDays || '0'), margin + 220);
    drawDayStat('Absent Days:', String(payrollData.absentDays || '0'), margin + 320);

    y -= 40;

    // 4. Earnings & Deductions Table
    const tableTop = y;
    const col1X = margin;
    const col2X = margin + contentWidth / 2 + 10;
    const amountCol1X = margin + contentWidth / 2 - 60;
    const amountCol2X = width - margin - 60;

    // Headers
    // Earnings Header
    drawText('Earnings', col1X, y, 11, { font: boldFont, color: rgb(0, 0.5, 0) }); // Greenish
    drawText('Deductions', col2X, y, 11, { font: boldFont, color: rgb(0.8, 0, 0) }); // Reddish

    y -= 20;

    // Subheaders
    drawText('Earning Head', col1X, y, 9, { font: boldFont });
    drawText('Total Amount', amountCol1X, y, 9, { font: boldFont });

    drawText('Deduction Head', col2X, y, 9, { font: boldFont });
    drawText('Total Amount', amountCol2X, y, 9, { font: boldFont });

    // Draw lines below the headers
    page.drawLine({ start: { x: col1X, y: y - 5 }, end: { x: col1X + contentWidth / 2 - 20, y: y - 5 }, color: gray, thickness: 0.5 });
    page.drawLine({ start: { x: col2X, y: y - 5 }, end: { x: width - margin, y: y - 5 }, color: gray, thickness: 0.5 });

    y -= 20;

    // Items
    const earnings = [
      ['Basic', payrollData.basicSalary],
      ['HRA', payrollData.hra],
      ['Conveyance Allowance', payrollData.transportAllowance],
      ['Special Allowance', payrollData.otherAllowances],
      ['Medical Allowance', payrollData.medicalAllowance]
    ].filter(i => Number(i[1]) > 0);

    const deductions = [
      ['Professional Tax', payrollData.professionalTax],
      ['Provident Fund', payrollData.providentFund],
      ['ESI', payrollData.esi],
      ['Income Tax', payrollData.incomeTax],
      ['Other Deductions', payrollData.otherDeductions]
    ].filter(i => Number(i[1]) > 0);

    const maxItems = Math.max(earnings.length, deductions.length);

    for (let i = 0; i < maxItems; i++) {
      if (earnings[i]) {
        drawText(earnings[i][0], col1X, y, 9);
        drawText(`Rs. ${fmt(earnings[i][1])}`, amountCol1X, y, 9);
      }
      if (deductions[i]) {
        drawText(deductions[i][0], col2X, y, 9);
        drawText(`Rs. ${fmt(deductions[i][1])}`, amountCol2X, y, 9);
      }
      y -= 15;
    }

    y -= 10;

    // Totals
    // Gross Earnings (Green Box)
    const totalRowHeight = 25;
    page.drawRectangle({
      x: col1X - 5,
      y: y - 5,
      width: contentWidth / 2 - 10,
      height: totalRowHeight,
      color: lightGreen
    });

    drawText('Gross Earnings', col1X, y + 5, 9, { font: boldFont });
    drawText(`Rs. ${fmt(payrollData.grossSalary)}`, amountCol1X, y + 5, 9, { font: boldFont });

    // Gross Deductions (Red Box)
    page.drawRectangle({
      x: col2X - 5,
      y: y - 5,
      width: contentWidth / 2 - 10,
      height: totalRowHeight,
      color: lightRed
    });

    drawText('Gross Deductions', col2X, y + 5, 9, { font: boldFont });
    drawText(`Rs. ${fmt(payrollData.totalDeductions)}`, amountCol2X, y + 5, 9, { font: boldFont });

    y -= 40;

    // 5. Net Salary Bar (Dark Blue)
    page.drawRectangle({
      x: margin,
      y: y - 10,
      width: contentWidth,
      height: 30,
      color: darkBlue
    });

    drawText('Net Salary', margin + 10, y, 11, { font: boldFont, color: white });
    drawText(`Rs. ${fmt(payrollData.netSalary)}`, width - margin - 100, y, 11, { font: boldFont, color: white });

    y -= 30;

    // Amount in words (Placeholder)
    drawText(`Net Amount in Words : Rs. ${fmt(payrollData.netSalary)}`, margin, y, 9);

    // Footer
    const footerY = 40;
    drawText('This is a computer generated payslip', width / 2 - 80, footerY, 8, { color: gray });

    return await pdfDoc.save();

  } catch (err: any) {
    console.error('Failed to generate payslip', err);
    alert('Failed to generate payslip: ' + (err?.message || err));
    return null;
  }
}

export async function generatePayslipPDF(payrollData: any, employeeData: any) {
  const pdfBytes = await createPayslipPDF(payrollData, employeeData);
  if (!pdfBytes) return;

  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip-${employeeData.firstName}-${payrollData.month}-${payrollData.year}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function getPayslipPDFUrl(payrollData: any, employeeData: any): Promise<string | null> {
  const pdfBytes = await createPayslipPDF(payrollData, employeeData);
  if (!pdfBytes) return null;

  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

export function downloadCSVReport(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
    const values = headers.map(h => `"${String(row[h] ?? '')}"`);
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}