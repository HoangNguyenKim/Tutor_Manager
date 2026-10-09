import { useEffect, useState } from 'react';
import { vi } from '../i18n';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardTitle } from '../components/Card';
import { EmptyState, Skeleton } from '../components/Feedback';
import { Label } from '../components/Field';
import { Table } from '../components/Table';
import { Page } from '../layout/Page';
import { useToast } from '../toast';

function useDemoLoading(delay = 600) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return loading;
}

export function DashboardPage() {
  const loading = useDemoLoading();
  return (
    <Page title={vi.dashboard}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-7 w-16" />
              </Card>
            ))
          : [
              { label: 'Học sinh', value: '0' },
              { label: 'Buổi học tuần này', value: '0' },
              { label: 'Giờ dạy tháng', value: '0h' },
              { label: 'Học phí chờ thu', value: '0₫' },
            ].map((s) => (
              <Card key={s.label}>
                <CardTitle>{s.label}</CardTitle>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </Card>
            ))}
      </div>
      <EmptyState title={vi.empty} hint="Dữ liệu sẽ hiện khi có học sinh và buổi học." />
    </Page>
  );
}

export function HoursPage() {
  return (
    <Page title={vi.hours}>
      <Table head={['Học sinh', 'Phút dự kiến', 'Phút thực tế', 'Phút thưởng', 'Phút tính phí']} rows={[]} />
      <EmptyState title={vi.empty} />
    </Page>
  );
}

export function TuitionPage() {
  return (
    <Page title={vi.tuition}>
      <Badge tone="warning">Số tiền lưu dạng VND nguyên — API ở bước sau</Badge>
      <EmptyState title={vi.empty} />
    </Page>
  );
}

export function ReportsPage() {
  return (
    <Page title={vi.reports}>
      <EmptyState title={vi.empty} hint="Báo cáo theo học sinh, tháng, trạng thái thu phí." />
    </Page>
  );
}

export function SettingsPage() {
  const { push } = useToast();
  return (
    <Page title={vi.settings}>
      <Card>
        <CardTitle>Đồng bộ Google Calendar (tùy chọn)</CardTitle>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Chỉ đồng bộ thông tin lịch dự kiến. Không gửi học phí, thanh toán, giờ thực dạy.
        </p>
        <form
          className="mt-3 flex max-w-sm flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            push('Đã lưu cài đặt (bản demo).');
          }}
        >
          <div>
            <Label htmlFor="sync">Chế độ đồng bộ</Label>
            <select id="sync" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="off">Tắt</option>
              <option value="push">Chỉ đẩy lịch dự kiến</option>
            </select>
          </div>
          <div>
            <Button type="submit">{vi.save}</Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
