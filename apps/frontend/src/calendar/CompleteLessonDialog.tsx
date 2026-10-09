import { useState, type FormEvent } from 'react';
import { ApiError, formatVnd } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Input, Label, Select } from '../components/Field';
import { useCompleteLesson, type LessonItem } from '../hooks/useLessons';
import { vi } from '../i18n';
import { useToast } from '../toast';

function previewBillable(scheduled: number, actual: number, policy: 'actual' | 'planned', bonusBillable: boolean): number {
  const bonus = Math.max(0, actual - scheduled);
  return (policy === 'planned' ? scheduled : actual) + (bonusBillable ? bonus : 0);
}

export function CompleteLessonDialog({ lesson, onClose }: { lesson: LessonItem; onClose: () => void }) {
  const { push } = useToast();
  const complete = useCompleteLesson();
  const [actual, setActual] = useState(String(lesson.scheduledMinutes));
  const [bonusBillable, setBonusBillable] = useState(false);
  const [policy, setPolicy] = useState<'actual' | 'planned'>(lesson.billingPolicy ?? 'actual');
  const [error, setError] = useState<string | null>(null);

  const actualNum = Number(actual);
  const valid = Number.isInteger(actualNum) && actualNum >= 1 && actualNum <= 480;
  const bonus = valid ? Math.max(0, actualNum - lesson.scheduledMinutes) : 0;
  const billable = valid ? previewBillable(lesson.scheduledMinutes, actualNum, policy, bonusBillable) : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid) {
      setError('Phút thực dạy phải là số nguyên 1–480.');
      return;
    }
    try {
      await complete.mutateAsync({ id: lesson.id, dto: { actualMinutes: actualNum, bonusBillable, billingPolicy: policy } });
      push('Đã hoàn thành buổi học.');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được. Thử lại.');
    }
  }

  return (
    <Dialog open onClose={onClose} title="Hoàn thành buổi học">
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <span>Dự kiến <strong>{lesson.scheduledMinutes}′</strong></span>
        {bonus > 0 ? (
          <Badge tone={bonusBillable ? 'warning' : 'info'}>+{bonus}′ thưởng{bonusBillable ? ' (tính phí)' : ' (miễn phí)'}</Badge>
        ) : (
          <Badge tone="neutral">Không thưởng</Badge>
        )}
        <span>Tính phí <strong>{valid ? billable : '—'}′</strong></span>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}
        <div>
          <Label htmlFor="cmp-actual">Phút thực dạy *</Label>
          <Input id="cmp-actual" inputMode="numeric" value={actual} onChange={(e) => setActual(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cmp-policy">Chính sách tính phí</Label>
            <Select id="cmp-policy" value={policy} onChange={(e) => setPolicy(e.target.value as typeof policy)}>
              <option value="actual">Theo thực dạy</option>
              <option value="planned">Theo dự kiến</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="cmp-bonus">Thưởng</Label>
            <Select id="cmp-bonus" value={bonusBillable ? 'billable' : 'free'} onChange={(e) => setBonusBillable(e.target.value === 'billable')}>
              <option value="free">Miễn phí</option>
              <option value="billable">Tính phí</option>
            </Select>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Học phí dự kiến: {valid ? formatVnd(Math.round((lesson.hourlyRateVnd * billable) / 60)) : '—'} (giữ nguyên đơn giá {formatVnd(lesson.hourlyRateVnd)}/giờ).
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {vi.cancel}
          </Button>
          <Button type="submit" disabled={complete.isPending}>
            {complete.isPending ? vi.loading : 'Hoàn thành'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
