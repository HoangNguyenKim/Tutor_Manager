import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Plus } from 'lucide-react';
import { ApiError } from '../api/client';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { EmptyState } from '../components/Feedback';
import { Input, Label, Select } from '../components/Field';
import { useCancelLesson, useCreateLesson, useLessons, useUpdateLesson, type LessonItem } from '../hooks/useLessons';
import { useStudents } from '../hooks/useStudents';
import { vi } from '../i18n';
import { Page } from '../layout/Page';
import { useToast } from '../toast';

const DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function eventColor(status: LessonItem['status']): string {
  if (status === 'cancelled') return '#94a3b8';
  if (status === 'completed') return '#16a34a';
  return '#0284c7';
}

function LessonDialog({
  initial,
  onClose,
}: {
  initial: { id?: string; start: Date; studentId?: string } | null;
  onClose: () => void;
}) {
  const { push } = useToast();
  const create = useCreateLesson();
  const update = useUpdateLesson();
  const students = useStudents({ status: 'active', pageSize: 100 });
  const [studentId, setStudentId] = useState(initial?.studentId ?? '');
  const [start, setStart] = useState(initial ? toLocalInput(initial.start.toISOString()) : '');
  const [minutes, setMinutes] = useState('60');
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;
  if (!initial) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!initial) return;
    setError(null);
    if (!studentId) {
      setError('Chọn học sinh.');
      return;
    }
    const mins = Number(minutes);
    if (!Number.isInteger(mins) || mins < 1 || mins > 480) {
      setError('Thời lượng phải là số nguyên 1–480 phút.');
      return;
    }
    const parsed = new Date(start);
    if (Number.isNaN(parsed.getTime())) {
      setError('Giờ bắt đầu không hợp lệ.');
      return;
    }
    try {
      if (initial.id) {
        await update.mutateAsync({ id: initial.id, dto: { scheduledStart: parsed.toISOString(), scheduledMinutes: mins } });
        push('Đã dời buổi học.');
      } else {
        await create.mutateAsync({ studentId, scheduledStart: parsed.toISOString(), scheduledMinutes: mins, timeZone: DEFAULT_TZ });
        push('Đã tạo buổi học.');
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        setError('Trùng lịch với buổi học khác của học sinh này.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không lưu được. Thử lại.');
      }
    }
  }

  return (
    <Dialog open onClose={onClose} title={initial.id ? 'Sửa buổi học' : 'Tạo buổi học'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}
        <div>
          <Label htmlFor="les-student">Học sinh *</Label>
          <Select id="les-student" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!!initial.id}>
            <option value="">— Chọn —</option>
            {(students.data?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.subject ? ` — ${s.subject}` : ''}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="les-start">Bắt đầu *</Label>
            <Input id="les-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="les-minutes">Phút *</Label>
            <Input id="les-minutes" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-500">Múi giờ: {DEFAULT_TZ}. Giờ lưu UTC, hiển thị giờ địa phương.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {vi.cancel}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? vi.loading : vi.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CalendarPage() {
  const { push } = useToast();
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [range, setRange] = useState<{ from: string; to: string }>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { from: from.toISOString(), to: to.toISOString() };
  });
  const [dialog, setDialog] = useState<{ id?: string; start: Date; studentId?: string } | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ id: string; start: Date } | null>(null);

  const lessons = useLessons({
    from: range.from,
    to: range.to,
    studentId: studentId || undefined,
    subject: subject.trim() || undefined,
    status: 'all',
  });
  const students = useStudents({ status: 'active', pageSize: 100 });
  const update = useUpdateLesson();
  const cancel = useCancelLesson();

  const events: EventInput[] = useMemo(
    () =>
      (lessons.data?.items ?? []).map((l: LessonItem) => ({
        id: l.id,
        title: `${l.student?.name ?? '—'}${l.status === 'cancelled' ? ' (đã hủy)' : ''}`,
        start: l.scheduledStart,
        end: new Date(new Date(l.scheduledStart).getTime() + l.scheduledMinutes * 60000).toISOString(),
        backgroundColor: eventColor(l.status),
        borderColor: eventColor(l.status),
        extendedProps: { status: l.status },
      })),
    [lessons.data],
  );

  function handleDateClick(arg: DateClickArg) {
    setDialog({ start: arg.date, studentId: studentId || undefined });
  }

  function handleEventClick(arg: EventClickArg) {
    const id = arg.event.id;
    const start = arg.event.start;
    if (!start) return;
    setDialog({ id, start, studentId: undefined });
  }

  function handleDrop(arg: EventDropArg) {
    const start = arg.event.start;
    if (!start) {
      arg.revert();
      return;
    }
    setPendingDrop({ id: arg.event.id, start });
    arg.revert();
  }

  async function confirmDrop() {
    if (!pendingDrop) return;
    try {
      await update.mutateAsync({ id: pendingDrop.id, dto: { scheduledStart: pendingDrop.start.toISOString() } });
      push('Đã dời buổi học.');
    } catch (err) {
      push(err instanceof ApiError && err.code === 'CONFLICT' ? 'Trùng lịch — giữ nguyên giờ cũ.' : 'Không dời được.');
    } finally {
      setPendingDrop(null);
    }
  }

  return (
    <Page
      title={vi.calendar}
      actions={
        <Button onClick={() => setDialog({ start: new Date() })}>
          <Plus aria-hidden="true" /> {vi.add}
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Select aria-label="Học sinh" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-48">
          <option value="">Mọi học sinh</option>
          {(students.data?.items ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Môn học" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-36">
          <option value="">Mọi môn</option>
          <option value="Toán">Toán</option>
          <option value="Lý">Lý</option>
          <option value="Hóa">Hóa</option>
          <option value="Tiếng Anh">Tiếng Anh</option>
        </Select>
      </div>

      {lessons.isError ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-red-600">Không tải được lịch. Kiểm tra backend rồi thử lại.</p>
          <Button variant="secondary" onClick={() => lessons.refetch()}>{vi.retry}</Button>
        </div>
      ) : lessons.data?.items.length === 0 ? (
        <EmptyState title={vi.empty} hint="Nhấn vào ngày giờ trên lịch hoặc nút Thêm mới để tạo buổi học." />
      ) : null}

      <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          buttonText={{ today: 'Hôm nay', month: 'Tháng', week: 'Tuần', day: 'Ngày' }}
          locale="vi"
          timeZone="local"
          editable
          selectable
          eventDrop={handleDrop}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          events={events}
          datesSet={(arg) => setRange({ from: arg.start.toISOString(), to: arg.end.toISOString() })}
          height="auto"
        />
      </div>

      {dialog ? <LessonDialog initial={dialog} onClose={() => setDialog(null)} /> : null}

      {pendingDrop ? (
        <Dialog open onClose={() => setPendingDrop(null)} title="Xác nhận dời lịch?">
          <p className="text-sm">
            Dời sang {pendingDrop.start.toLocaleString('vi-VN')}? Hệ thống sẽ kiểm tra trùng lịch trước khi lưu.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingDrop(null)}>
              {vi.cancel}
            </Button>
            <Button onClick={confirmDrop} disabled={update.isPending}>
              {update.isPending ? vi.loading : 'Xác nhận'}
            </Button>
          </div>
        </Dialog>
      ) : null}

      {dialog?.id ? (
        <div className="flex justify-end">
          <Button
            variant="danger"
            onClick={() =>
              cancel.mutate(dialog.id as string, {
                onSuccess: () => {
                  push('Đã hủy buổi học (giữ lại lịch sử).');
                  setDialog(null);
                },
              })
            }
          >
            Hủy buổi học
          </Button>
        </div>
      ) : null}
    </Page>
  );
}
