export interface PayslipPdfData {
  companyName: string;
  periodLabel: string;
  employeeName: string;
  nik: string;
  department: string;
  position: string;
  status: string;
  baseSalary: number;
  allowance: number;
  overtime: number;
  deductions: number;
  bpjs: number;
  pph21: number;
  total: number;
  payrollStatus: string;
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Menghasilkan dokumen PDF 1.4 standar untuk Slip Gaji tanpa dependency eksternal.
 */
export function buildPayslipPdfBuffer(data: PayslipPdfData): Buffer {
  const grossIncome = data.baseSalary + data.allowance + data.overtime;
  const totalDeductions = data.deductions + data.bpjs + data.pph21;

  const lines: Array<{
    x: number;
    y: number;
    size: number;
    bold?: boolean;
    text: string;
  }> = [
    { x: 50, y: 780, size: 16, bold: true, text: data.companyName },
    {
      x: 50,
      y: 760,
      size: 12,
      bold: true,
      text: `SLIP GAJI KARYAWAN - PERIODE ${data.periodLabel.toUpperCase()}`,
    },
    {
      x: 50,
      y: 745,
      size: 9,
      text: '================================================================================',
    },
    { x: 50, y: 725, size: 10, bold: true, text: 'INFORMASI KARYAWAN' },
    { x: 50, y: 708, size: 10, text: `Nama Lengkap : ${data.employeeName}` },
    { x: 50, y: 693, size: 10, text: `NIK          : ${data.nik}` },
    { x: 50, y: 678, size: 10, text: `Departemen   : ${data.department}` },
    { x: 320, y: 708, size: 10, text: `Jabatan      : ${data.position}` },
    { x: 320, y: 693, size: 10, text: `Status Kerja : ${data.status}` },
    { x: 320, y: 678, size: 10, text: `Status Slip  : ${data.payrollStatus}` },
    {
      x: 50,
      y: 660,
      size: 9,
      text: '--------------------------------------------------------------------------------',
    },
    // Kolom Kiri: Pendapatan | Kolom Kanan: Potongan
    { x: 50, y: 640, size: 11, bold: true, text: 'A. KOMPONEN PENDAPATAN' },
    { x: 320, y: 640, size: 11, bold: true, text: 'B. KOMPONEN POTONGAN' },

    { x: 50, y: 618, size: 10, text: 'Gaji Pokok' },
    { x: 190, y: 618, size: 10, text: `: ${formatRupiah(data.baseSalary)}` },
    { x: 320, y: 618, size: 10, text: 'Potongan Telat/Alpa' },
    { x: 450, y: 618, size: 10, text: `: ${formatRupiah(data.deductions)}` },

    { x: 50, y: 600, size: 10, text: 'Tunjangan Tetap' },
    { x: 190, y: 600, size: 10, text: `: ${formatRupiah(data.allowance)}` },
    { x: 320, y: 600, size: 10, text: 'BPJS (Kes & TK)' },
    { x: 450, y: 600, size: 10, text: `: ${formatRupiah(data.bpjs)}` },

    { x: 50, y: 582, size: 10, text: 'Uang Lembur' },
    { x: 190, y: 582, size: 10, text: `: ${formatRupiah(data.overtime)}` },
    { x: 320, y: 582, size: 10, text: 'Pajak PPh 21' },
    { x: 450, y: 582, size: 10, text: `: ${formatRupiah(data.pph21)}` },

    {
      x: 50,
      y: 562,
      size: 9,
      text: '--------------------------------------------------------------------------------',
    },
    { x: 50, y: 545, size: 10, bold: true, text: 'Total Pendapatan' },
    {
      x: 190,
      y: 545,
      size: 10,
      bold: true,
      text: `: ${formatRupiah(grossIncome)}`,
    },
    { x: 320, y: 545, size: 10, bold: true, text: 'Total Potongan' },
    {
      x: 450,
      y: 545,
      size: 10,
      bold: true,
      text: `: ${formatRupiah(totalDeductions)}`,
    },
    {
      x: 50,
      y: 525,
      size: 9,
      text: '================================================================================',
    },
    {
      x: 50,
      y: 500,
      size: 13,
      bold: true,
      text: `TAKE HOME PAY (GAJI BERSIH): ${formatRupiah(data.total)}`,
    },
    {
      x: 50,
      y: 480,
      size: 9,
      text: '================================================================================',
    },
    {
      x: 50,
      y: 450,
      size: 8,
      text: 'Dokumen ini diterbitkan secara elektronik oleh Sistem HRIS dan sah tanpa tanda tangan basah.',
    },
  ];

  const streamCommands = ['BT'];
  for (const line of lines) {
    const fontKey = line.bold ? '/F2' : '/F1';
    streamCommands.push(`${fontKey} ${line.size} Tf`);
    streamCommands.push(`1 0 0 1 ${line.x} ${line.y} Tm`);
    streamCommands.push(`(${escapePdfText(line.text)}) Tj`);
  }
  streamCommands.push('ET');

  const contentStream = streamCommands.join('\n');
  const contentLength = Buffer.byteLength(contentStream, 'utf8');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i++) {
    const offsetStr = String(offsets[i]).padStart(10, '0');
    pdf += `${offsetStr} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
