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
import { SUBJECTS, type Subject } from '@tutor-manager/shared';
import { CompleteLessonDialog } from './CompleteLessonDialog';
import { vi } from '../i18n';
import { Page } from '../layout/Page';
import { useToast } from '../toast';
import { createSubmissionGate, integerInput, lessonDefaults, parseLocalDateTime } from '../hooks/formValidation';
type LessonDraft = { start: Date; studentId?: string; lesson?: LessonItem };

const DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function eventColor(status: LessonItem['status']): string {
  if (status === 'cancelled') return '#776579';
  if (status === 'completed') return '#92604f';
  return '#78619c';
}

function LessonDialog({
  initial,
  onClose,
  onComplete,
}: {
  initial: LessonDraft;
  onClose: () => void;
  onComplete: (lesson: LessonItem) => void;
}) {
  const { push } = useToast();
  const create = useCreateLesson();
  const update = useUpdateLesson();
  const students = useStudents({ status: 'active', pageSize: 100 });
  const cancel = useCancelLesson();
  const [submission] = useState(createSubmissionGate);
  const lesson = initial.lesson;
  const defaults = lessonDefaults(lesson ?? initial);
  const [studentId, setStudentId] = useState(defaults.studentId);
  const [subject, setSubject] = useState<Subject>(defaults.subject as Subject);
  const [start, setStart] = useState(toLocalInput(initial.start.toISOString()));
  const [minutes, setMinutes] = useState(defaults.minutes);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const pending = create.isPending || update.isPending || cancel.isPending;
  const readOnly = !!lesson && lesson.status !== 'scheduled';
  const locked = pending || confirmCancel || readOnly;
  const close = () => { if (!pending && !submission.pending) onClose(); };

  async function handleCancel() {
    if (!lesson || lesson.status !== 'scheduled' || pending || submission.pending) return;
    setError(null);
    await submission.run(async () => {
      try {
        await cancel.mutateAsync(lesson.id);
        push('Đã hủy buổi học (giữ lại lịch sử).');
        onClose();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Không hủy được. Thử lại.');
      }
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || submission.pending || confirmCancel || (lesson && lesson.status !== 'scheduled')) return;
    setError(null);
    if (!studentId || (!lesson && (students.isPending || students.isError))) {
      setError('Chọn học sinh.');
      return;
    }
    const mins = integerInput(minutes, 1, 480);
    if (mins === null) {
      setError('Thời lượng phải là số nguyên 1–480 phút.');
      return;
    }
    const parsed = parseLocalDateTime(start);
    if (!parsed) {
      setError('Giờ bắt đầu không hợp lệ.');
      return;
    }
    await submission.run(async () => {
    try {
      if (lesson) {
        await update.mutateAsync({ id: lesson.id, dto: { scheduledStart: parsed.toISOString(), scheduledMinutes: mins, subject } });
        push('Đã dời buổi học.');
      } else {
        await create.mutateAsync({ studentId, scheduledStart: parsed.toISOString(), scheduledMinutes: mins, subject, timeZone: DEFAULT_TZ });
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
    });
  }

  return (
    <Dialog open onClose={close} title={lesson ? 'Sửa buổi học' : 'Tạo buổi học'}>
      <form noValidate aria-busy={pending} onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}
        <div>
          <Label htmlFor="les-student">Học sinh *</Label>
          <Select id="les-student" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!!lesson || pending || confirmCancel || students.isPending || students.isError}>
            <option value="">— Chọn —</option>
            {lesson && !(students.data?.items ?? []).some((s) => s.id === lesson.studentId) ? <option value={lesson.studentId}>{lesson.student?.name ?? `Học sinh (${lesson.studentId})`}</option> : null}
            {(students.data?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="les-subject">Môn học *</Label>
          <Select id="les-subject" disabled={locked} value={subject} onChange={(e) => setSubject(e.target.value as Subject)}>
            {SUBJECTS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="les-start">Bắt đầu *</Label>
            <Input id="les-start" disabled={locked} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="les-minutes">Phút *</Label>
            <Input id="les-minutes" disabled={locked} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-500">Múi giờ: {DEFAULT_TZ}. Giờ lưu UTC, hiển thị giờ địa phương.</p>
        {students.isPending && !lesson ? <p role="status" className="text-sm">Đang tải học sinh…</p> : null}
        {students.isError ? <div role="alert" className="text-sm">Không tải được danh sách học sinh. <Button variant="secondary" onClick={() => students.refetch()}>Thử lại</Button></div> : null}
        {lesson && lesson.status !== 'scheduled' ? <p role="status" className="text-sm">Buổi học {lesson.status === 'completed' ? 'đã hoàn thành' : 'đã hủy'} — chỉ xem thông tin, không sửa lịch sử.</p> : null}
        {confirmCancel ? (
          <div className="rounded-xl border p-3 space-y-3">
            <p>Bạn muốn hủy buổi học này? Lịch sử vẫn được giữ lại.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" disabled={pending} onClick={() => setConfirmCancel(false)}>Quay lại</Button>
              <Button variant="danger" disabled={pending} onClick={handleCancel}>{pending ? vi.loading : 'Xác nhận hủy'}</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            {lesson?.status === 'scheduled' ? <>
              <Button variant="danger" disabled={pending} onClick={() => { setError(null); setConfirmCancel(true); }}>Hủy buổi học</Button>
              <Button variant="secondary" disabled={pending} onClick={() => { if (!submission.pending) onComplete(lesson); }}>Hoàn thành</Button>
            </> : null}
            <Button type="button" variant="secondary" disabled={pending} onClick={close}>{vi.cancel}</Button>
            {!lesson || lesson.status === 'scheduled' ? <Button type="submit" disabled={pending || (!lesson && (students.isPending || students.isError))}>{pending ? vi.loading : vi.save}</Button> : null}
          </div>
        )}
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
  const [dialog, setDialog] = useState<LessonDraft | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ id: string; start: Date } | null>(null);
  const [completing, setCompleting] = useState<LessonItem | null>(null);

  const lessons = useLessons({
    from: range.from,
    to: range.to,
    studentId: studentId || undefined,
    subject: subject.trim() || undefined,
    status: 'all',
  });
  const students = useStudents({ status: 'active', pageSize: 100 });
  const update = useUpdateLesson();
  const [dropGate] = useState(createSubmissionGate);

  const events: EventInput[] = useMemo(
    () =>
      (lessons.data?.items ?? []).map((l: LessonItem) => ({
        id: l.id,
        title: `${l.student?.name ?? '—'} · ${l.subject}${l.status === 'cancelled' ? ' (đã hủy)' : ''}`,
        start: l.scheduledStart,
        end: new Date(new Date(l.scheduledStart).getTime() + l.scheduledMinutes * 60000).toISOString(),
        backgroundColor: eventColor(l.status),
        borderColor: eventColor(l.status),
        textColor: '#ffffff',
        startEditable: l.status === 'scheduled',
        durationEditable: false,
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
    const lesson = lessons.data?.items.find((item) => item.id === id);
    if (lesson) setDialog({ start, studentId: lesson.studentId, lesson });
  }

  function handleDrop(arg: EventDropArg) {
    const start = arg.event.start;
    if (!start || arg.event.extendedProps['status'] !== 'scheduled') {
      arg.revert();
      return;
    }
    setPendingDrop({ id: arg.event.id, start });
    arg.revert();
  }

  async function confirmDrop() {
    if (!pendingDrop || update.isPending || dropGate.pending) return;
    await dropGate.run(async () => {
      try {
        await update.mutateAsync({ id: pendingDrop.id, dto: { scheduledStart: pendingDrop.start.toISOString() } });
        push('Đã dời buổi học.');
        setPendingDrop(null);
      } catch (err) {
        push(err instanceof ApiError && err.code === 'CONFLICT' ? 'Trùng lịch — giữ nguyên giờ cũ.' : 'Không dời được. Vui lòng thử lại.');
      }
    });
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
          {SUBJECTS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
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
          datesSet={(arg) => {
            const from = arg.start.toISOString();
            const to = arg.end.toISOString();
            setRange((prev) => (prev.from === from && prev.to === to ? prev : { from, to }));
          }}
          height="auto"
        />
      </div>

      {dialog ? <LessonDialog initial={dialog} onClose={() => setDialog(null)} onComplete={(lesson) => { setDialog(null); setCompleting(lesson); }} /> : null}

      {pendingDrop ? (
        <Dialog open onClose={() => { if (!update.isPending && !dropGate.pending) setPendingDrop(null); }} title="Xác nhận dời lịch?">
          <p className="text-sm">
            Dời sang {pendingDrop.start.toLocaleString('vi-VN')}? Hệ thống sẽ kiểm tra trùng lịch trước khi lưu.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" disabled={update.isPending} onClick={() => { if (!dropGate.pending) setPendingDrop(null); }}>
              {vi.cancel}
            </Button>
            <Button onClick={confirmDrop} disabled={update.isPending}>
              {update.isPending ? vi.loading : 'Xác nhận'}
            </Button>
          </div>
        </Dialog>
      ) : null}



      {completing ? <CompleteLessonDialog lesson={completing} onClose={() => setCompleting(null)} /> : null}
    </Page>
  );
}
