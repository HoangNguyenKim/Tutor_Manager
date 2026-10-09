import { useState, type FormEvent } from 'react';
import type { CreateStudentDto, StudentDto } from '@tutor-manager/shared';
import { ApiError } from '../api/client';
import { Button } from '../components/Button';
import { Input, Label, Textarea } from '../components/Field';
import { vi } from '../i18n';

export interface StudentFormValues {
  name: string;
  phone: string;
  parentContact: string;
  grade: string;
  hourlyRateVnd: string;
  notes: string;
}

export function toFormValues(s?: StudentDto): StudentFormValues {
  return {
    name: s?.name ?? '',
    phone: s?.phone ?? '',
    parentContact: s?.parentContact ?? '',
    grade: s?.grade ?? '',
    hourlyRateVnd: s?.hourlyRateVnd?.toString() ?? '',
    notes: s?.notes ?? '',
  };
}

function toDto(v: StudentFormValues): CreateStudentDto {
  const rate = v.hourlyRateVnd.trim() === '' ? undefined : Number(v.hourlyRateVnd);
  return {
    name: v.name.trim(),
    ...(v.phone.trim() ? { phone: v.phone.trim() } : {}),
    ...(v.parentContact.trim() ? { parentContact: v.parentContact.trim() } : {}),
    ...(v.grade.trim() ? { grade: v.grade.trim() } : {}),
    ...(rate !== undefined ? { hourlyRateVnd: rate } : {}),
    ...(v.notes.trim() ? { notes: v.notes.trim() } : {}),
  };
}

export function StudentForm({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: StudentDto;
  pending: boolean;
  submitLabel: string;
  onSubmit: (dto: CreateStudentDto) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<StudentFormValues>(() => toFormValues(initial));
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof StudentFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.name.trim()) {
      setError('Tên học sinh là bắt buộc.');
      return;
    }
    if (values.hourlyRateVnd.trim() !== '') {
      const n = Number(values.hourlyRateVnd);
      if (!Number.isInteger(n) || n < 0) {
        setError('Học phí giờ phải là số nguyên VND >= 0.');
        return;
      }
    }
    try {
      await onSubmit(toDto(values));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Không lưu được. Thử lại.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <div>
        <Label htmlFor="stu-name">Tên học sinh *</Label>
        <Input id="stu-name" value={values.name} onChange={set('name')} maxLength={120} placeholder="Nguyễn Văn A" />
      </div>
      <div>
        <Label htmlFor="stu-grade">Khối lớp</Label>
        <Input id="stu-grade" value={values.grade} onChange={set('grade')} maxLength={30} placeholder="10" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="stu-phone">Điện thoại</Label>
          <Input id="stu-phone" value={values.phone} onChange={set('phone')} maxLength={30} />
        </div>
        <div>
          <Label htmlFor="stu-parent">Liên hệ phụ huynh</Label>
          <Input id="stu-parent" value={values.parentContact} onChange={set('parentContact')} maxLength={120} />
        </div>
      </div>
      <div>
        <Label htmlFor="stu-rate">Học phí giờ (VND)</Label>
        <Input id="stu-rate" inputMode="numeric" value={values.hourlyRateVnd} onChange={set('hourlyRateVnd')} placeholder="200000" />
      </div>
      <div>
        <Label htmlFor="stu-notes">Ghi chú</Label>
        <Textarea id="stu-notes" value={values.notes} onChange={set('notes')} maxLength={2000} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {vi.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? vi.loading : submitLabel}
        </Button>
      </div>
    </form>
  );
}
