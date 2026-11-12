import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { formatVnd } from '../api/client';
import { Button } from '../components/Button';
import { Card, CardTitle } from '../components/Card';
import { EmptyState, Skeleton } from '../components/Feedback';
import { Label, Select } from '../components/Field';
import { DateRange } from '../components/DateRange';
import { useToast } from '../toast';
import {
  useBonusReport,
  useMonthlyReport,
  usePaymentReport,
  useStudentHistory,
  type RangeParams,
} from '../hooks/useReports';
import { useStudents } from '../hooks/useStudents';
import { vi } from '../i18n';
import { Page } from '../layout/Page';
import { exportBonus, exportMonthly, exportPayments } from './exportExcel';

type Tab = 'monthly' | 'history' | 'bonus' | 'payments';

function ReportError({ onRetry }: { onRetry: () => unknown }) {
  return (
    <Card role="alert">
      <p>Không tải được báo cáo. Dữ liệu chưa khả dụng, vui lòng thử lại.</p>
      <Button
        variant="secondary"
        className="mt-4"
        onClick={() => {
          void onRetry();
        }}
      >
        {vi.retry}
      </Button>
    </Card>
  );
}

export function ReportsPage() {
  const { push } = useToast();
  const [exporting, setExporting] = useState(false);
  const runExport = async (operation: () => Promise<void>) => {
    setExporting(true);
    try {
      await operation();
    } catch {
      push('Không xuất được Excel. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };
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
      <div className="flex flex-wrap gap-2 print:hidden" role="group" aria-label="Loại báo cáo">
        {(
          [
            ['monthly', 'Học phí tháng'],
            ['history', 'Lịch sử học sinh'],
            ['bonus', 'Giờ thưởng'],
            ['payments', 'Thanh toán'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <Button
            key={k}
            variant={tab === k ? 'primary' : 'secondary'}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'monthly' ? (
        <>
          <Card className="flex flex-wrap items-end gap-3 print:hidden">
            <div>
              <Label htmlFor="rep-year">Năm</Label>
              <Select
                id="rep-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-24"
              >
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="rep-month">Tháng</Label>
              <Select
                id="rep-month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-28"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </Select>
            </div>
            {monthly.data ? (
              <>
                <Button
                  variant="secondary"
                  disabled={exporting}
                  onClick={() => runExport(() => exportMonthly(monthly.data!))}
                >
                  <Download aria-hidden="true" /> Excel
                </Button>
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer aria-hidden="true" /> In
                </Button>
              </>
            ) : null}
          </Card>
          {monthly.isLoading ? (
            <div role="status" aria-label="Đang tải báo cáo">
              <Skeleton className="h-40" />
              <span className="sr-only">Đang tải báo cáo…</span>
            </div>
          ) : monthly.isError ? (
            <ReportError onRetry={() => monthly.refetch()} />
          ) : monthly.data ? (
            monthly.data.students.length === 0 ? (
              <EmptyState title={vi.empty} hint="Tháng này chưa có dữ liệu." />
            ) : (
              <Card>
                <CardTitle>
                  Học phí tháng {month}/{year} — {formatVnd(monthly.data.totals.tuitionVnd)} · Đã
                  thu {formatVnd(monthly.data.totals.collectedVnd)}
                </CardTitle>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="text-slate-500">
                        <th scope="col" className="py-1 font-medium">
                          Học sinh
                        </th>
                        <th scope="col" className="font-medium">
                          Buổi
                        </th>
                        <th scope="col" className="font-medium">
                          Phút tính phí
                        </th>
                        <th scope="col" className="font-medium">
                          Học phí
                        </th>
                        <th scope="col" className="font-medium">
                          Đã thu
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.data.students.map((s) => (
                        <tr
                          key={s.studentId}
                          className="border-t border-slate-200 dark:border-slate-800"
                        >
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
            <ReportError onRetry={() => monthly.refetch()} />
          )}
        </>
      ) : null}

      {tab === 'history' ? (
        <>
          <Card className="flex flex-wrap items-end gap-3 print:hidden">
            <Select
              aria-label="Học sinh"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-48"
            >
              <option value="">— Chọn học sinh —</option>
              {(students.data?.items ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <DateRange params={range} onChange={setRange} />
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer aria-hidden="true" /> In
            </Button>
          </Card>
          {students.isError && <ReportError onRetry={() => students.refetch()} />}
          {!studentId ? (
            <EmptyState title={vi.empty} hint="Chọn học sinh để xem lịch sử dạy." />
          ) : history.isLoading ? (
            <div role="status" aria-label="Đang tải báo cáo">
              <Skeleton className="h-40" />
              <span className="sr-only">Đang tải báo cáo…</span>
            </div>
          ) : history.isError || !history.data ? (
            <ReportError onRetry={() => history.refetch()} />
          ) : history.data.lessons.length === 0 ? (
            <EmptyState
              title="Chưa có lịch sử dạy"
              hint="Không có buổi học trong khoảng đã chọn."
            />
          ) : (
            <Card>
              <CardTitle>Lịch sử dạy ({history.data?.lessons.length ?? 0} buổi)</CardTitle>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th scope="col" className="py-1 font-medium">
                        Ngày
                      </th>
                      <th scope="col" className="font-medium">
                        Môn
                      </th>
                      <th scope="col" className="font-medium">
                        Dự kiến
                      </th>
                      <th scope="col" className="font-medium">
                        Thực dạy
                      </th>
                      <th scope="col" className="font-medium">
                        Thưởng
                      </th>
                      <th scope="col" className="font-medium">
                        Học phí
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (history.data?.lessons ?? []) as {
                        id: string;
                        scheduledStart: string;
                        subject: string;
                        scheduledMinutes: number;
                        actualMinutes: number | null;
                        bonusMinutes: number;
                        tuitionVnd: number;
                      }[]
                    ).map((l) => (
                      <tr key={l.id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="py-1">
                          {new Date(l.scheduledStart).toLocaleDateString('vi-VN')}
                        </td>
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
          <Card className="flex flex-wrap items-end gap-3 print:hidden">
            <DateRange params={range} onChange={setRange} />
            {bonus.data ? (
              <Button
                variant="secondary"
                disabled={exporting}
                onClick={() => runExport(() => exportBonus(bonus.data!))}
              >
                <Download aria-hidden="true" /> Excel
              </Button>
            ) : null}
          </Card>
          {bonus.isLoading ? (
            <div role="status" aria-label="Đang tải báo cáo">
              <Skeleton className="h-40" />
              <span className="sr-only">Đang tải báo cáo…</span>
            </div>
          ) : bonus.isError || !bonus.data ? (
            <ReportError onRetry={() => bonus.refetch()} />
          ) : bonus.data && bonus.data.students.length > 0 ? (
            <Card>
              <CardTitle>Tổng hợp giờ thưởng</CardTitle>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th scope="col" className="py-1 font-medium">
                        Học sinh
                      </th>
                      <th scope="col" className="font-medium">
                        Phút thưởng
                      </th>
                      <th scope="col" className="font-medium">
                        Thưởng tính phí
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonus.data.students.map((s) => (
                      <tr
                        key={s.studentId}
                        className="border-t border-slate-200 dark:border-slate-800"
                      >
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
          <Card className="flex flex-wrap items-end gap-3 print:hidden">
            <DateRange params={range} onChange={setRange} />
            {payments.data ? (
              <>
                <Button
                  variant="secondary"
                  disabled={exporting}
                  onClick={() => runExport(() => exportPayments(payments.data!))}
                >
                  <Download aria-hidden="true" /> Excel
                </Button>
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer aria-hidden="true" /> In
                </Button>
              </>
            ) : null}
          </Card>
          {payments.isLoading ? (
            <div role="status" aria-label="Đang tải báo cáo">
              <Skeleton className="h-40" />
              <span className="sr-only">Đang tải báo cáo…</span>
            </div>
          ) : payments.isError || !payments.data ? (
            <ReportError onRetry={() => payments.refetch()} />
          ) : payments.data && payments.data.payments.length > 0 ? (
            <Card>
              <CardTitle>Lịch sử thanh toán — {formatVnd(payments.data.totalVnd)}</CardTitle>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th scope="col" className="py-1 font-medium">
                        Ngày
                      </th>
                      <th scope="col" className="font-medium">
                        Học sinh
                      </th>
                      <th scope="col" className="font-medium">
                        Số tiền
                      </th>
                      <th scope="col" className="font-medium">
                        Ghi chú
                      </th>
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
