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
  const widgets = d
    ? [
        { label: 'Học sinh đang học', value: String(d.activeStudents) },
        { label: 'Buổi đã lên lịch', value: String(d.scheduledLessons) },
        { label: 'Buổi đã hoàn thành', value: String(d.completedLessons) },
        { label: 'Giờ dự kiến', value: `${Math.floor(d.plannedMinutes / 60)}h${d.plannedMinutes % 60 ? `${d.plannedMinutes % 60}p` : ''}` },
        { label: 'Giờ thực dạy', value: `${Math.floor(d.actualMinutes / 60)}h${d.actualMinutes % 60 ? `${d.actualMinutes % 60}p` : ''}` },
        { label: 'Giờ thưởng', value: `${Math.floor(d.bonusMinutes / 60)}h${d.bonusMinutes % 60 ? `${d.bonusMinutes % 60}p` : ''}` },
        { label: 'Giờ tính phí', value: `${Math.floor(d.billableMinutes / 60)}h${d.billableMinutes % 60 ? `${d.billableMinutes % 60}p` : ''}` },
        { label: 'Học phí', value: formatVnd(d.tuitionVnd) },
        { label: 'Đã thu', value: formatVnd(d.collectedVnd) },
        { label: 'Còn nợ', value: formatVnd(d.outstandingVnd) },
      ]
    : [];

  return (
    <Page
      title={vi.dashboard}
      actions={
        d ? (
          <Button variant="secondary" onClick={() => exportOverview(d)}>
            <Download aria-hidden="true" /> Excel
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="dash-preset">Khoảng</Label>
          <Select id="dash-preset" value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)} className="w-36">
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="custom">Tùy chọn</option>
          </Select>
        </div>
        {preset === 'custom' ? (
          <>
            <div>
              <Label htmlFor="dash-from">Từ</Label>
              <Input id="dash-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dash-to">Đến</Label>
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
          <p role="alert" className="text-sm text-red-600">Không tải được. Thử lại.</p>
          <Button variant="secondary" onClick={() => overview.refetch()}>{vi.retry}</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {widgets.map((w) => (
              <Card key={w.label}>
                <CardTitle>{w.label}</CardTitle>
                <p className="mt-1 text-2xl font-bold">{w.value}</p>
              </Card>
            ))}
          </div>
          {d.upcoming.length > 0 ? (
            <Card>
              <CardTitle>Buổi sắp tới</CardTitle>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {d.upcoming.map((u) => (
                  <li key={u.id}>
                    {new Date(u.scheduledStart).toLocaleString('vi-VN')} — {u.studentName} · {u.subject} ({u.scheduledMinutes}′)
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState title={vi.empty} hint="Không có buổi sắp tới." />
          )}
        </>
      )}
    </Page>
  );
}
