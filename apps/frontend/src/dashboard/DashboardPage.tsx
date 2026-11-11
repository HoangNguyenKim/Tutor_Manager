import { useState } from 'react';
import { Download } from 'lucide-react';
import { formatVnd } from '../api/client';
import { Button } from '../components/Button';
import { Card, CardTitle } from '../components/Card';
import { EmptyState, Skeleton } from '../components/Feedback';
import { Input, Label, Select } from '../components/Field';
import { useOverview, type RangeParams, type RangePreset } from '../hooks/useReports';
import { vi } from '../i18n';
import { Page } from '../layout/Page';
import { exportOverview } from '../reports/exportExcel';

function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DashboardPage() {
  const [preset, setPreset] = useState<RangePreset>('month');
  const [from, setFrom] = useState(toISODate(new Date()));
  const [to, setTo] = useState(toISODate(new Date()));
  const params: RangeParams = preset === 'custom' ? { preset, from: new Date(from).toISOString(), to: new Date(to).toISOString() } : { preset };
  const overview = useOverview(params);

  const d = overview.data;

  return (
    <Page
      title={vi.dashboard}
      actions={
        d ? (
          <Button variant="secondary" onClick={() => exportOverview(d)}>
            <Download aria-hidden="true" /> Xuất Excel
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <div>
          <Label htmlFor="dash-preset">Khoảng thời gian</Label>
          <Select id="dash-preset" value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)} className="w-40">
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="custom">Tùy chọn</option>
          </Select>
        </div>
        {preset === 'custom' ? (
          <>
            <div>
              <Label htmlFor="dash-from">Từ ngày</Label>
              <Input id="dash-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dash-to">Đến ngày</Label>
              <Input id="dash-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        ) : null}
      </div>

      {overview.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={vi.loading}>
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-7 w-16" />
            </Card>
          ))}
        </div>
      ) : overview.isError || !d ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-red-600">Không tải được dữ liệu tổng quan. Vui lòng thử lại.</p>
          <Button variant="secondary" onClick={() => overview.refetch()}>{vi.retry}</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Enhanced Metrics Grid with professional styling & icons */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border-l-4 border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-medium">
                <span>Học sinh đang học</span>
                <span className="text-xl">🎓</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{d.activeStudents}</span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">Hoạt động</span>
              </div>
            </div>

            <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-medium">
                <span>Buổi đã hoàn thành</span>
                <span className="text-xl">📚</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{d.completedLessons}</span>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded">Lịch trình</span>
              </div>
            </div>

            <div className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-medium">
                <span>Đã thu học phí</span>
                <span className="text-xl">💰</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{formatVnd(d.collectedVnd)}</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded">Thực thu</span>
              </div>
            </div>

            <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-medium">
                <span>Học phí còn nợ</span>
                <span className="text-xl">⚠️</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{formatVnd(d.outstandingVnd)}</span>
                <span className="text-xs font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">Cần thu</span>
              </div>
            </div>
          </div>

          {/* Secondary detailed metrics card row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardTitle>Tổng thời gian thực dạy</CardTitle>
              <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-200">
                {Math.floor(d.actualMinutes / 60)}h {d.actualMinutes % 60}p
              </p>
            </Card>
            <Card>
              <CardTitle>Tổng giờ tính phí</CardTitle>
              <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-200">
                {Math.floor(d.billableMinutes / 60)}h {d.billableMinutes % 60}p
              </p>
            </Card>
            <Card>
              <CardTitle>Tổng học phí dự kiến</CardTitle>
              <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatVnd(d.tuitionVnd)}
              </p>
            </Card>
          </div>

          {/* Upcoming lessons section styled as shift cards */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                Các buổi học sắp tới ({d.upcoming.length})
              </h2>
            </div>

            {d.upcoming.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {d.upcoming.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-xl p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded-md bg-blue-100 dark:bg-blue-900/50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {new Date(u.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({u.scheduledMinutes} phút)
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        {u.subject}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        👤 {u.studentName}
                      </div>
                      <div className="text-xs text-slate-500">
                        📅 {new Date(u.scheduledStart).toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                      <a
                        href="#/calendar"
                        className="flex-1 text-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 transition-colors shadow-sm"
                      >
                        Xem lịch dạy
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={vi.empty} hint="Không có buổi học nào sắp tới." />
            )}
          </div>
        </div>
      )}
    </Page>
  );
}
