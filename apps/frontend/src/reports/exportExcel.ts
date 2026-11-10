import ExcelJS from 'exceljs';
import type { BonusReportDto, MonthlyReportDto, OverviewDto, PaymentReportDto } from '@tutor-manager/shared';

async function download(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp(ws: ExcelJS.Worksheet) {
  ws.columns.forEach((c) => {
    c.width = 22;
  });
}

export async function exportOverview(data: OverviewDto) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tổng quan');
  ws.addRow(['Chỉ tiêu', 'Giá trị']);
  const rows: [string, number | string][] = [
    ['Học sinh đang học', data.activeStudents],
    ['Buổi đã lên lịch', data.scheduledLessons],
    ['Buổi đã hoàn thành', data.completedLessons],
    ['Phút dự kiến', data.plannedMinutes],
    ['Phút thực dạy', data.actualMinutes],
    ['Phút thưởng', data.bonusMinutes],
    ['Phút tính phí', data.billableMinutes],
    ['Học phí (VND)', data.tuitionVnd],
    ['Đã thu (VND)', data.collectedVnd],
    ['Còn nợ (VND)', data.outstandingVnd],
  ];
  rows.forEach((r) => ws.addRow(r));
  stamp(ws);
  download(await wb.xlsx.writeBuffer(), 'tong-quan.xlsx');
}

export async function exportMonthly(data: MonthlyReportDto) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Thang ${data.month}-${data.year}`);
  ws.addRow(['Học sinh', 'Buổi', 'Phút tính phí', 'Học phí (VND)', 'Đã thu (VND)']);
  data.students.forEach((s) => ws.addRow([s.studentName, s.lessons, s.minutes, s.tuitionVnd, s.paidVnd]));
  ws.addRow(['Tổng', data.totals.lessons, '', data.totals.tuitionVnd, data.totals.collectedVnd]);
  stamp(ws);
  download(await wb.xlsx.writeBuffer(), `hoc-phi-${data.year}-${data.month}.xlsx`);
}

export async function exportBonus(data: BonusReportDto) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Thưởng');
  ws.addRow(['Học sinh', 'Phút thưởng', 'Thưởng tính phí']);
  data.students.forEach((s) => ws.addRow([s.studentName, s.bonusMinutes, s.billableBonusMinutes]));
  stamp(ws);
  download(await wb.xlsx.writeBuffer(), 'thuong.xlsx');
}

export async function exportPayments(data: PaymentReportDto) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Thanh toán');
  ws.addRow(['Học sinh', 'Số tiền (VND)', 'Ngày', 'Ghi chú']);
  data.payments.forEach((p) =>
    ws.addRow([p.studentName, p.amountVnd, new Date(p.paidAt).toLocaleDateString('vi-VN'), p.note ?? '']),
  );
  ws.addRow(['Tổng', data.totalVnd, '', '']);
  stamp(ws);
  download(await wb.xlsx.writeBuffer(), 'thanh-toan.xlsx');
}
