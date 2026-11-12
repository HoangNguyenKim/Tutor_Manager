import { useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  Clock3,
  Download,
  GraduationCap,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { formatVnd } from '../api/client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, Skeleton } from '../components/Feedback';
import { DateRange } from '../components/DateRange';
import { useOverview, type RangeParams } from '../hooks/useReports';
import { vi } from '../i18n';
import { Page } from '../layout/Page';
import { exportOverview } from '../reports/exportExcel';
import { useToast } from '../toast';

const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}p`;

export function DashboardPage() {
  const [params, setParams] = useState<RangeParams>({ preset: 'month' });
  const overview = useOverview(params);
  const { push } = useToast();
  const [exporting, setExporting] = useState(false);
  const d = overview.data;

  return (
    <Page
      title={vi.dashboard}
      actions={
        d ? (
          <Button
            variant="secondary"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await exportOverview(d);
              } catch {
                push('Không xuất được Excel. Vui lòng thử lại.');
              } finally {
                setExporting(false);
              }
            }}
          >
            <Download aria-hidden="true" />
            {exporting ? 'Đang xuất…' : 'Xuất Excel'}
          </Button>
        ) : undefined
      }
    >
      <section className="tm-welcome">
        <div>
          <p className="tm-eyebrow">KHÔNG GIAN DẠY HỌC</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Mỗi buổi học, một bước tiến.
          </h3>
          <p className="tm-muted mt-3 max-w-xl text-sm leading-relaxed">
            Theo dõi lịch dạy, thời gian và học phí trong một không gian gọn gàng.
          </p>
        </div>
        <a
          className="tm-text-link inline-flex items-center gap-2 text-sm font-semibold"
          href="#/calendar"
        >
          Mở lịch dạy <ArrowUpRight aria-hidden="true" className="size-4" />
        </a>
      </section>
      <Card className="flex flex-wrap items-end gap-3">
        <DateRange params={params} onChange={setParams} />
        {d && (
          <p className="tm-muted ml-auto text-xs">
            {new Date(d.range.from).toLocaleDateString('vi-VN')} —{' '}
            {new Date(d.range.to).toLocaleDateString('vi-VN')}
          </p>
        )}
      </Card>
      {overview.isLoading ? (
        <div
          role="status"
          aria-label={vi.loading}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-4 h-9 w-20" />
            </Card>
          ))}
          <span className="sr-only">{vi.loading}</span>
        </div>
      ) : overview.isError || !d ? (
        <Card role="alert">
          <p>Không tải được dữ liệu tổng quan. Vui lòng thử lại.</p>
          <Button className="mt-4" variant="secondary" onClick={() => overview.refetch()}>
            {vi.retry}
          </Button>
        </Card>
      ) : (
        <div className="space-y-7">
          <section
            aria-label="Tổng quan dạy học"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              {
                label: 'Học sinh đang học',
                value: d.activeStudents,
                icon: GraduationCap,
                note: 'Đang hoạt động',
                tone: 'rose',
              },
              {
                label: 'Buổi đã lên lịch',
                value: d.scheduledLessons,
                icon: CalendarDays,
                note: 'Trong khoảng đã chọn',
                tone: 'lavender',
              },
              {
                label: 'Buổi đã hoàn thành',
                value: d.completedLessons,
                icon: CheckCheck,
                note: 'Đã ghi nhận thực dạy',
                tone: 'ivory',
              },
              {
                label: 'Đã thu học phí',
                value: formatVnd(d.collectedVnd),
                icon: Wallet,
                note: 'Thanh toán đã ghi nhận',
                tone: 'rose',
              },
            ].map(({ label, value, icon: Icon, note, tone }) => (
              <Card key={label} className={`tm-metric tm-metric-${tone}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">{label}</h3>
                  <span className="tm-icon-tile">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="tm-metric-value mt-5 text-2xl font-semibold tracking-tight">
                  {value}
                </p>
                <p className="tm-muted mt-2 text-xs">{note}</p>
              </Card>
            ))}
          </section>
          <section
            aria-label="Chi tiết thời gian và học phí"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {[
              ['Thời gian dự kiến', duration(d.plannedMinutes)],
              ['Thời gian thực dạy', duration(d.actualMinutes)],
              ['Giờ thưởng', duration(d.bonusMinutes)],
              ['Thời gian tính phí', duration(d.billableMinutes)],
              ['Tổng học phí', formatVnd(d.tuitionVnd)],
              ['Học phí còn nợ', formatVnd(d.outstandingVnd)],
            ].map(([label, value]) => (
              <Card key={label} className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="tm-muted text-xs font-medium">{label}</h3>
                  <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
                </div>
                {label === 'Giờ thưởng' ? (
                  <Sparkles className="tm-muted size-5 shrink-0" aria-hidden="true" />
                ) : (
                  <Clock3 className="tm-muted size-5 shrink-0" aria-hidden="true" />
                )}
              </Card>
            ))}
          </section>
          <section aria-labelledby="upcoming-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 id="upcoming-title" className="text-lg font-semibold">
                Buổi học sắp tới <span className="tm-count ml-2">{d.upcoming.length}</span>
              </h3>
              <a href="#/calendar" className="tm-text-link text-sm font-medium">
                Xem lịch dạy →
              </a>
            </div>
            {d.upcoming.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {d.upcoming.map((lesson) => (
                  <Card key={lesson.id} className="tm-lesson-card">
                    <div className="flex items-start justify-between gap-3">
                      <span className="tm-count">{lesson.subject}</span>
                      <span className="tm-muted text-xs">{lesson.scheduledMinutes} phút</span>
                    </div>
                    <h4 className="mt-4 font-semibold">{lesson.studentName}</h4>
                    <p className="tm-muted mt-3 flex items-center gap-2 text-sm">
                      <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                      <time dateTime={lesson.scheduledStart}>
                        {new Date(lesson.scheduledStart).toLocaleDateString('vi-VN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </time>
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm">
                      <Clock3 className="size-4" aria-hidden="true" />
                      {new Date(lesson.scheduledStart).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Chưa có buổi học sắp tới"
                hint="Các buổi học đã lên lịch sẽ xuất hiện tại đây."
              />
            )}
          </section>
        </div>
      )}
    </Page>
  );
}
