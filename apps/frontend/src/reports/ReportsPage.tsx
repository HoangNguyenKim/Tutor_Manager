import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { formatVnd } from '../api/client';
import { Button } from '../components/Button';
import { Card, CardTitle } from '../components/Card';
import { EmptyState, Skeleton } from '../components/Feedback';
import { Input, Label, Select } from '../components/Field';
import { useBonusReport, useMonthlyReport, usePaymentReport, useStudentHistory, type RangeParams, type RangePreset } from '../hooks/useReports';
import { useStudents } from '../hooks/useStudents';
import { vi } from '../i18n';
import { Page } from '../layout/Page';
import { exportBonus, exportMonthly, exportPayments } from './exportExcel';

type Tab = 'monthly' | 'history' | 'bonus' | 'payments';

function RangeFilter({ params, onChange }: { params: RangeParams; onChange: (p: RangeParams) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="rep-preset">Khoảng</Label>
        <Select id="rep-preset" value={params.preset} onChange={(e) => onChange({ ...params, preset: e.target.value as RangePreset })} className="w-36">
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
          <option value="custom">Tùy chọn</option>
        </Select>
      </div>
      {params.preset === 'custom' ? (
        <>
          <div>
            <Label htmlFor="rep-from">Từ</Label>
            <Input id="rep-from" type="date" value={params.from?.slice(0, 10) ?? ''} onChange={(e) => onChange({ ...params, from: new Date(e.target.value).toISOString() })} />
          </div>
          <div>
            <Label htmlFor="rep-to">Đến</Label>
            <Input id="rep-to" type="date" value={params.to?.slice(0, 10) ?? ''} onChange={(e) => onChange({ ...params, to: new Date(e.target.value).toISOString() })} />
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ReportsPage() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [range, setRange] = useState<RangeParams>({ preset: 'month' });
  const [studentId, setStudentId] = useState('');

  const monthly = useMonthlyReport(year, month);
  const bonus = useBonusReport(range);
  const payments = usePaymentReport(range);
  const students = useStudents({ status: 'active', pageSize: 100 });
  const history = useStudentHistory(studentId || undefined, range);

  return (
    <Page title={vi.reports}>
      <div className="flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Loại báo cáo">
        {(
          [
            ['monthly', 'Học phí tháng'],
            ['history', 'Lịch sử học sinh'],
            ['bonus', 'Giờ thưởng'],
            ['payments', 'Thanh toán'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <Button key={k} variant={tab === k ? 'primary' : 'secondary'} onClick={() => setTab(k)} role="tab" aria-selected={tab === k}>
            {label}
          </Button>
        ))}
      </div>

      {tab === 'monthly' ? (
        <>
          <div className="flex flex-wrap items-end gap-2 print:hidden">
            <div>
              <Label htmlFor="rep-year">Năm</Label>
              <Select id="rep-year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24">
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="rep-month">Tháng</Label>
              <Select id="rep-month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-28">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </Select>
            </div>
            {monthly.data ? (
              <>
                <Button variant="secondary" onClick={() => exportMonthly(monthly.data)}>
                  <Download aria-hidden="true" /> Excel
                </Button>
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer aria-hidden="true" /> In
                </Button>
              </>
            ) : null}
          </div>
          {monthly.isLoading ? (
            <Skeleton className="h-40" />
          ) : monthly.data ? (
            monthly.data.students.length === 0 ? (
              <EmptyState title={vi.empty} hint="Tháng này chưa có dữ liệu." />
            ) : (
              <Card>
                <CardTitle>
                  Học phí tháng {month}/{year} — {formatVnd(monthly.data.totals.tuitionVnd)} · Đã thu {formatVnd(monthly.data.totals.collectedVnd)}
                </CardTitle>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="py-1 font-medium">Học sinh</th>
                        <th className="font-medium">Buổi</th>
                        <th className="font-medium">Phút tính phí</th>
                        <th className="font-medium">Học phí</th>
                        <th className="font-medium">Đã thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.data.students.map((s) => (
                        <tr key={s.studentId} className="border-t border-slate-200 dark:border-slate-800">
                          <td className="py-1 font-medium">{s.studentName}</td>
                          <td>{s.lessons}</td>
                          <td>{s.minutes}′</td>
                          <td>{formatVnd(s.tuitionVnd)}</td>
                          <td>{formatVnd(s.paidVnd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          ) : (
            <p role="alert" className="text-sm text-red-600">Không tải được.</p>
          )}
        </>
      ) : null}

      {tab === 'history' ? (
        <>
          <div className="flex flex-wrap items-end gap-2 print:hidden">
            <Select aria-label="Học sinh" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-48">
              <option value="">— Chọn học sinh —</option>
              {(students.data?.items ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <RangeFilter params={range} onChange={setRange} />
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer aria-hidden="true" /> In
            </Button>
          </div>
          {!studentId ? (
            <EmptyState title={vi.empty} hint="Chọn học sinh để xem lịch sử dạy." />
          ) : history.isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <Card>
              <CardTitle>Lịch sử dạy ({(history.data?.lessons.length ?? 0)} buổi)</CardTitle>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="py-1 font-medium">Ngày</th>
                      <th className="font-medium">Môn</th>
                      <th className="font-medium">Dự kiến</th>
                      <th className="font-medium">Thực dạy</th>
                      <th className="font-medium">Thưởng</th>
                      <th className="font-medium">Học phí</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((history.data?.lessons ?? []) as { id: string; scheduledStart: string; subject: string; scheduledMinutes: number; actualMinutes: number | null; bonusMinutes: number; tuitionVnd: number }[]).map((l) => (
                      <tr key={l.id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="py-1">{new Date(l.scheduledStart).toLocaleDateString('vi-VN')}</td>
                        <td>{l.subject}</td>
                        <td>{l.scheduledMinutes}′</td>
                        <td>{l.actualMinutes ?? '—'}</td>
                        <td>{l.bonusMinutes > 0 ? `+${l.bonusMinutes}′` : '0′'}</td>
                        <td>{formatVnd(l.tuitionVnd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : null}

      {tab === 'bonus' ? (
        <>
          <div className="flex flex-wrap items-end gap-2 print:hidden">
            <RangeFilter params={range} onChange={setRange} />
            {bonus.data ? (
              <Button variant="secondary" onClick={() => exportBonus(bonus.data)}>
                <Download aria-hidden="true" /> Excel
              </Button>
            ) : null}
          </div>
          {bonus.isLoading ? (
            <Skeleton className="h-40" />
          ) : bonus.data && bonus.data.students.length > 0 ? (
            <Card>
              <CardTitle>Tổng hợp giờ thưởng</CardTitle>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="py-1 font-medium">Học sinh</th>
                      <th className="font-medium">Phút thưởng</th>
                      <th className="font-medium">Thưởng tính phí</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonus.data.students.map((s) => (
                      <tr key={s.studentId} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="py-1 font-medium">{s.studentName}</td>
                        <td>{s.bonusMinutes}′</td>
                        <td>{s.billableBonusMinutes}′</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState title={vi.empty} hint="Khoảng này không có giờ thưởng." />
          )}
        </>
      ) : null}

      {tab === 'payments' ? (
        <>
          <div className="flex flex-wrap items-end gap-2 print:hidden">
            <RangeFilter params={range} onChange={setRange} />
            {payments.data ? (
              <>
                <Button variant="secondary" onClick={() => exportPayments(payments.data)}>
                  <Download aria-hidden="true" /> Excel
                </Button>
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer aria-hidden="true" /> In
                </Button>
              </>
            ) : null}
          </div>
          {payments.isLoading ? (
            <Skeleton className="h-40" />
          ) : payments.data && payments.data.payments.length > 0 ? (
            <Card>
              <CardTitle>Lịch sử thanh toán — {formatVnd(payments.data.totalVnd)}</CardTitle>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="py-1 font-medium">Ngày</th>
                      <th className="font-medium">Học sinh</th>
                      <th className="font-medium">Số tiền</th>
                      <th className="font-medium">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.data.payments.map((p) => (
                      <tr key={p.id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="py-1">{new Date(p.paidAt).toLocaleDateString('vi-VN')}</td>
                        <td className="font-medium">{p.studentName}</td>
                        <td>{formatVnd(p.amountVnd)}</td>
                        <td>{p.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState title={vi.empty} hint="Khoảng này chưa có thanh toán." />
          )}
        </>
      ) : null}
    </Page>
  );
}
