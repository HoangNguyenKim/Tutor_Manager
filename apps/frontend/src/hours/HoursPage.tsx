import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatVnd } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { EmptyState, Skeleton } from '../components/Feedback';
import { Select } from '../components/Field';
import { useLessons, type LessonItem } from '../hooks/useLessons';
import { useStudents } from '../hooks/useStudents';
import { vi } from '../i18n';
import { Page } from '../layout/Page';
import { CompleteLessonDialog } from '../calendar/CompleteLessonDialog';

function BonusBadge({ lesson }: { lesson: LessonItem }) {
  if (lesson.status !== 'completed') return <span className="text-slate-400">—</span>;
  if (lesson.bonusMinutes <= 0) return <Badge tone="neutral">0′</Badge>;
  return <Badge tone={lesson.bonusBillable ? 'warning' : 'info'}>+{lesson.bonusMinutes}′{lesson.bonusBillable ? '' : ' miễn phí'}</Badge>;
}

export function HoursPage() {
  const [studentId, setStudentId] = useState('');
  const [completing, setCompleting] = useState<LessonItem | null>(null);
  const lessons = useLessons({ studentId: studentId || undefined, status: 'all' });
  const students = useStudents({ status: 'active', pageSize: 100 });

  const items = [...(lessons.data?.items ?? [])].sort(
    (a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime(),
  );
  const totals = items
    .filter((l) => l.status === 'completed')
    .reduce(
      (acc, l) => ({
        scheduled: acc.scheduled + l.scheduledMinutes,
        actual: acc.actual + (l.actualMinutes ?? 0),
        bonus: acc.bonus + l.bonusMinutes,
        billable: acc.billable + l.billableMinutes,
        tuition: acc.tuition + l.tuitionVnd,
      }),
      { scheduled: 0, actual: 0, bonus: 0, billable: 0, tuition: 0 },
    );

  return (
    <Page title={vi.hours}>
      <div className="flex flex-wrap gap-2">
        <Select aria-label="Học sinh" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-48">
          <option value="">Mọi học sinh</option>
          {(students.data?.items ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {lessons.data ? (
          <p className="self-center text-xs text-slate-500">
            Dự kiến {totals.scheduled}′ · Thực dạy {totals.actual}′ · Thưởng {totals.bonus}′ · Tính phí {totals.billable}′ · {formatVnd(totals.tuition)}
          </p>
        ) : null}
      </div>

      {lessons.isLoading ? (
        <div className="flex flex-col gap-2" aria-label={vi.loading}>
          <Skeleton className="h-10" /> <Skeleton className="h-10" /> <Skeleton className="h-10" />
        </div>
      ) : lessons.isError ? (
        <p role="alert" className="text-sm text-red-600">Không tải được. Thử lại.</p>
      ) : items.length === 0 ? (
        <EmptyState title={vi.empty} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Ngày</th>
                <th scope="col" className="px-4 py-2 font-medium">Học sinh</th>
                <th scope="col" className="px-4 py-2 font-medium">Dự kiến</th>
                <th scope="col" className="px-4 py-2 font-medium">Thực dạy</th>
                <th scope="col" className="px-4 py-2 font-medium">Thưởng</th>
                <th scope="col" className="px-4 py-2 font-medium">Tính phí</th>
                <th scope="col" className="px-4 py-2 font-medium">Học phí</th>
                <th scope="col" className="px-4 py-2 font-medium"><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-4 py-2">{new Date(l.scheduledStart).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-2 font-medium">{l.student?.name ?? '—'}</td>
                  <td className="px-4 py-2">{l.scheduledMinutes}′</td>
                  <td className="px-4 py-2">{l.actualMinutes ?? '—'}</td>
                  <td className="px-4 py-2"><BonusBadge lesson={l} /></td>
                  <td className="px-4 py-2">{l.status === 'completed' ? `${l.billableMinutes}′` : '—'}</td>
                  <td className="px-4 py-2">{l.status === 'completed' ? formatVnd(l.tuitionVnd) : '—'}</td>
                  <td className="px-4 py-2">
                    {l.status === 'scheduled' ? (
                      <Button variant="ghost" size="icon" title="Hoàn thành" aria-label={`Hoàn thành buổi ${l.student?.name ?? ''}`} onClick={() => setCompleting(l)}>
                        <CheckCircle2 aria-hidden="true" />
                      </Button>
                    ) : l.status === 'completed' ? (
                      <Badge tone="success">Đã xong</Badge>
                    ) : (
                      <Badge tone="neutral">Đã hủy</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {completing ? <CompleteLessonDialog lesson={completing} onClose={() => setCompleting(null)} /> : null}
    </Page>
  );
}
