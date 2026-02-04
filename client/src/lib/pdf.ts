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
    const { PDFDocument, rgb, StandardFonts } = pdfLib;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    // --- Design System ---
    // Colors (Google-like / Professional Palette)
    const colors = {
      primary: rgb(0.10, 0.14, 0.49),      // #1a237e (Deep Slate Blue)
      secondary: rgb(0.39, 0.45, 0.55),    // #64748b (Cool Slate Gray)
      accent: rgb(0.06, 0.73, 0.51),       // #10b981 (Emerald Green)
      background: rgb(0.97, 0.98, 0.99),   // #f8fafc (Very Light Gray/Blue)
      white: rgb(1, 1, 1),
      black: rgb(0.1, 0.1, 0.1),
      border: rgb(0.9, 0.9, 0.92),
    };

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
        color: options.color || colors.black,
        ...options
      });
    };

    const drawLine = (y: number, thickness: number = 1, color = colors.border) => {
      page.drawLine({
        start: { x: 40, y },
        end: { x: width - 40, y },
        thickness,
        color,
      });
    };

    const fmt = (v: any) => {
      const n = Number(v ?? 0);
      return isNaN(n) ? '0.00' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatMonth = (m: any) => {
      if (!m) return '';
      if (isNaN(Number(m))) return String(m).toUpperCase();
      const monthNum = parseInt(String(m));
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        const date = new Date();
        date.setMonth(monthNum - 1);
        return date.toLocaleString('default', { month: 'long' });
      }
      return String(m).toUpperCase();
    };

    // --- Layout Execution ---

    let y = height - 60;
    const margin = 40;
    const contentWidth = width - (2 * margin);

    // 1. Header Section
    try {
      const logoUrl = '/progenics-logo.png';
      const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.35); // Scale down as needed

      page.drawImage(logoImage, {
        x: margin,
        y: y - 5, // slight adjustment for alignment
        width: logoDims.width,
        height: logoDims.height,
      });
    } catch (e) {
      console.error("Failed to load logo, falling back to text", e);
      // Fallback or leave blank? User specifically asked for logo. 
      // Better to fallback to text if image fails to ensure PDF is usable.
      drawText('PROGENICS', margin, y, 22, { font: boldFont, color: colors.primary });
    }

    // Payslip Month/Year (Right Aligned)
    const dateText = `Payslip for ${formatMonth(payrollData.month)} ${payrollData.year}`;
    const dateTextWidth = boldFont.widthOfTextAtSize(dateText, 12);
    drawText(dateText, width - margin - dateTextWidth, y + 6, 12, { font: boldFont, color: colors.secondary });

    y -= 25;
    drawLine(y, 1.5, colors.primary);
    y -= 30;

    // 2. Employee Details (Boxed Island)
    const boxHeight = 100;
    const boxY = y - boxHeight;

    // Background for Employee Details
    page.drawRectangle({
      x: margin,
      y: boxY,
      width: contentWidth,
      height: boxHeight,
      color: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      // rx: 4, ry: 4 // Rounded corners if supported by this version of pdf-lib, otherwise rect
    });

    const col1X = margin + 20;
    const col2X = margin + (contentWidth / 3) + 20;
    const col3X = margin + (2 * contentWidth / 3) + 20;

    let textY = y - 25;
    const labelSize = 8;
    const valSize = 10;
    const rowGap = 25;

    // Row 1
    drawText('EMPLOYEE NAME', col1X, textY, labelSize, { color: colors.secondary, font: boldFont });
    drawText(`${employeeData.firstName} ${employeeData.lastName}`, col1X, textY - 12, valSize, { font: boldFont });

    drawText('DESIGNATION', col2X, textY, labelSize, { color: colors.secondary, font: boldFont });
    drawText(employeeData.role || '-', col2X, textY - 12, valSize);

    drawText('JOINING DATE', col3X, textY, labelSize, { color: colors.secondary, font: boldFont });
    drawText(employeeData.joinDate ? new Date(employeeData.joinDate).toLocaleDateString() : '-', col3X, textY - 12, valSize);

    // Row 2
    textY -= rowGap + 15;

    drawText('EMPLOYEE ID', col1X, textY, labelSize, { color: colors.secondary, font: boldFont });
    drawText(employeeData.employeeId || '-', col1X, textY - 12, valSize);

    drawText('PAN NUMBER', col2X, textY, labelSize, { color: colors.secondary, font: boldFont });
    drawText(employeeData.panNumber || '-', col2X, textY - 12, valSize);

    drawText('LOCATION', col3X, textY, labelSize, { color: colors.secondary, font: boldFont });
    drawText(payrollData.city || employeeData.city || '-', col3X, textY - 12, valSize);

    y = boxY - 30;

    // 3. Attendance Summary (Horizontal Stat Bar)
    const statBoxWidth = contentWidth / 4;
    const statLabels = ['Total Days', 'Days Paid', 'Arrear Days', 'Absent Days'];
    const statValues = [
      String(payrollData.totalDays || '30'),
      String(payrollData.daysPaid || '30'),
      String(payrollData.arrearDays || '0'),
      String(payrollData.absentDays || '0')
    ];

    for (let i = 0; i < 4; i++) {
      const xPos = margin + (i * statBoxWidth);
      drawText(statLabels[i], xPos + 10, y, 9, { color: colors.secondary });
      drawText(statValues[i], xPos + 10, y - 15, 12, { font: boldFont });
      // Vertical divider except for last
      if (i < 3) {
        page.drawLine({
          start: { x: xPos + statBoxWidth, y: y + 5 },
          end: { x: xPos + statBoxWidth, y: y - 20 },
          color: colors.border,
          thickness: 1
        });
      }
    }

    y -= 50;

    // 4. Financials (Two Columns)
    const leftTableX = margin;
    const rightTableX = margin + (contentWidth / 2) + 15;
    const tableWidth = (contentWidth / 2) - 15;

    // Headers
    // Earnings Header
    page.drawRectangle({ x: leftTableX, y: y - 20, width: tableWidth, height: 25, color: rgb(0.93, 0.98, 0.95) }); // Light Green Tint
    drawText('EARNINGS', leftTableX + 10, y - 13, 9, { font: boldFont, color: colors.accent });
    drawText('AMOUNT', leftTableX + tableWidth - 60, y - 13, 9, { font: boldFont, color: colors.accent });

    // Deductions Header
    page.drawRectangle({ x: rightTableX, y: y - 20, width: tableWidth, height: 25, color: rgb(1, 0.95, 0.95) }); // Light Red Tint
    drawText('DEDUCTIONS', rightTableX + 10, y - 13, 9, { font: boldFont, color: rgb(0.8, 0.2, 0.2) });
    drawText('AMOUNT', rightTableX + tableWidth - 60, y - 13, 9, { font: boldFont, color: rgb(0.8, 0.2, 0.2) });

    y -= 40;

    // Items Logic
    const earnings = [
      ['Basic Salary', payrollData.basicSalary],
      ['HRA', payrollData.hra],
      ['Transport Allowance', payrollData.transportAllowance],
      ['Medical Allowance', payrollData.medicalAllowance],
      ['Special Allowance', payrollData.otherAllowances],
    ].filter(i => Number(i[1]) > 0);

    const deductions = [
      ['Professional Tax', payrollData.professionalTax],
      ['Provident Fund', payrollData.providentFund],
      ['ESI', payrollData.esi],
      ['Income Tax', payrollData.incomeTax],
      ['Other Deductions', payrollData.otherDeductions],
      ['Absent Deduction', payrollData.absentDeduction],
      ['Loss of Pay', payrollData.lop]
    ].filter(i => Number(i[1]) > 0);

    const maxRows = Math.max(earnings.length, deductions.length);
    const rowHeight = 22;

    for (let i = 0; i < maxRows; i++) {
      // Earnings Item
      if (earnings[i]) {
        drawText(earnings[i][0], leftTableX + 10, y, 9, { color: colors.secondary });
        const amt = `Rs. ${fmt(earnings[i][1])}`;
        const amtWidth = font.widthOfTextAtSize(amt, 9);
        drawText(amt, leftTableX + tableWidth - 10 - amtWidth, y, 9, { color: colors.black });
      }

      // Deductions Item
      if (deductions[i]) {
        drawText(deductions[i][0], rightTableX + 10, y, 9, { color: colors.secondary });
        const amt = `Rs. ${fmt(deductions[i][1])}`;
        const amtWidth = font.widthOfTextAtSize(amt, 9);
        drawText(amt, rightTableX + tableWidth - 10 - amtWidth, y, 9, { color: colors.black });
      }

      // Dotted line separator
      page.drawLine({
        start: { x: leftTableX, y: y - 8 }, end: { x: width - margin, y: y - 8 },
        color: colors.border, thickness: 0.5, dashArray: [2, 2]
      });

      y -= rowHeight;
    }

    y -= 10;

    // 5. Totals
    // Draw Top Border for Totals
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, color: colors.border, thickness: 1 });
    y -= 25;

    // Gross Totals
    drawText('Gross Earnings', leftTableX + 10, y, 10, { font: boldFont });
    const grossText = `Rs. ${fmt(payrollData.grossSalary)}`;
    drawText(grossText, leftTableX + tableWidth - 10 - boldFont.widthOfTextAtSize(grossText, 10), y, 10, { font: boldFont });

    drawText('Gross Deductions', rightTableX + 10, y, 10, { font: boldFont });
    const dedText = `Rs. ${fmt(payrollData.totalDeductions)}`;
    drawText(dedText, rightTableX + tableWidth - 10 - boldFont.widthOfTextAtSize(dedText, 10), y, 10, { font: boldFont, color: rgb(0.8, 0.2, 0.2) });

    y -= 40;

    // 6. Net Pay (Highlighted Box)
    const netBoxHeight = 45;
    page.drawRectangle({
      x: width - margin - 250,
      y: y - 10,
      width: 250,
      height: netBoxHeight,
      color: colors.primary
    });

    drawText('NET PAYABLE', width - margin - 230, y + 10, 10, { color: colors.white, font: font });
    const netText = `Rs. ${fmt(payrollData.netSalary)}`;
    const netTextWidth = boldFont.widthOfTextAtSize(netText, 18);
    drawText(netText, width - margin - 20 - netTextWidth, y + 5, 18, { color: colors.white, font: boldFont });

    // Amount in Words
    const numberToWords = (num: number): string => {
      const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      const inWords = (n: number): string => {
        if ((n = n.toString() as any).length > 9) return 'overflow';
        const n_array: any[] = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/) || [];
        if (!n_array) return '';
        let str = '';
        str += (Number(n_array[1]) !== 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
        str += (Number(n_array[2]) !== 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
        str += (Number(n_array[3]) !== 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
        str += (Number(n_array[4]) !== 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
        str += (Number(n_array[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
        return str;
      }

      const parts = num.toString().split('.');
      let words = inWords(Number(parts[0]));
      // Optional: Add paise handling if needed, user only asked for "Rupees Only" mostly
      return words.trim();
    };

    y -= 40;
    const netWords = numberToWords(Math.round(Number(payrollData.netSalary)));
    drawText(`Net Amount in Words : ${netWords} Rupees Only`, margin, y, 9, { color: colors.secondary, font: font });

    // Footer
    const footerY = 30;
    page.drawLine({ start: { x: margin, y: footerY + 15 }, end: { x: width - margin, y: footerY + 15 }, color: colors.border, thickness: 0.5 });
    drawText('This is a computer generated payslip.', margin, footerY, 8, { color: colors.secondary });
    drawText('Progenics | Confidential', width - margin - 100, footerY, 8, { color: colors.secondary });

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