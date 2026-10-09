import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { ApiError, formatVnd } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardTitle } from '../components/Card';
import { Dialog } from '../components/Dialog';
import { EmptyState, Skeleton } from '../components/Feedback';
import { Input, Label, Select, Textarea } from '../components/Field';
import { useCorrectPayment, useCreateAdjustment, useCreatePayment, usePayments, useStatement } from '../hooks/useTuition';
import { useStudents } from '../hooks/useStudents';
import { vi } from '../i18n';
import { Page } from '../layout/Page';
import { useToast } from '../toast';

function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function PaymentDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { push } = useToast();
  const create = useCreatePayment();
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(todayInput());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(amount);
    if (!Number.isInteger(n) || n < 1) {
      setError('Số tiền phải là số nguyên VND >= 1.');
      return;
    }
    try {
      const res = await create.mutateAsync({
        studentId,
        amountVnd: n,
        paidAt: new Date(paidAt).toISOString(),
        ...(note.trim() ? { note: note.trim() } : {}),
        idempotencyKey: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${n}`,
      });
      push(res.duplicate ? 'Đã ghi nhận thanh toán trước đó.' : 'Đã ghi nhận thanh toán.');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được. Thử lại.');
    }
  }

  return (
    <Dialog open onClose={onClose} title="Ghi nhận thanh toán">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="pay-amount">Số tiền (VND) *</Label>
            <Input id="pay-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="300000" />
          </div>
          <div>
            <Label htmlFor="pay-date">Ngày thu *</Label>
            <Input id="pay-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="pay-note">Ghi chú</Label>
          <Textarea id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {vi.cancel}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? vi.loading : vi.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CorrectDialog({ paymentId, current, onClose }: { paymentId: string; current: number; onClose: () => void }) {
  const { push } = useToast();
  const correct = useCorrectPayment();
  const [amount, setAmount] = useState(String(current));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(amount);
    if (!Number.isInteger(n) || n < 1) {
      setError('Số tiền phải là số nguyên VND >= 1.');
      return;
    }
    if (!reason.trim()) {
      setError('Lý do điều chỉnh là bắt buộc (lưu vết kiểm toán).');
      return;
    }
    try {
      await correct.mutateAsync({ id: paymentId, dto: { newAmountVnd: n, reason: reason.trim() } });
      push('Đã sửa thanh toán (có lưu vết).');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được. Thử lại.');
    }
  }

  return (
    <Dialog open onClose={onClose} title="Sửa thanh toán">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}
        <p className="text-sm">Hiện tại: <strong>{formatVnd(current)}</strong></p>
        <div>
          <Label htmlFor="corr-amount">Số tiền mới (VND) *</Label>
          <Input id="corr-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="corr-reason">Lý do *</Label>
          <Textarea id="corr-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Ghi thiếu tiền mặt…" />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {vi.cancel}
          </Button>
          <Button type="submit" disabled={correct.isPending}>
            {correct.isPending ? vi.loading : vi.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function AdjustmentDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { push } = useToast();
  const create = useCreateAdjustment();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(amount);
    if (!Number.isInteger(n) || n === 0) {
      setError('Số tiền điều chỉnh phải là số nguyên khác 0 (âm = giảm).');
      return;
    }
    if (!reason.trim()) {
      setError('Lý do là bắt buộc.');
      return;
    }
    try {
      await create.mutateAsync({ studentId, amountVnd: n, reason: reason.trim() });
      push('Đã thêm điều chỉnh học phí.');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được. Thử lại.');
    }
  }

  return (
    <Dialog open onClose={onClose} title="Điều chỉnh học phí">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}
        <div>
          <Label htmlFor="adj-amount">Số tiền (VND) *</Label>
          <Input id="adj-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="-50000" />
        </div>
        <div>
          <Label htmlFor="adj-reason">Lý do *</Label>
          <Textarea id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {vi.cancel}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? vi.loading : vi.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function TuitionPage() {
  const now = new Date();
  const [studentId, setStudentId] = useState('');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [payOpen, setPayOpen] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [correcting, setCorrecting] = useState<{ id: string; amount: number } | null>(null);

  const students = useStudents({ status: 'active', pageSize: 100 });
  const statement = useStatement(studentId || undefined, year, month);
  const payments = usePayments(studentId || undefined);

  return (
    <Page
      title={vi.tuition}
      actions={
        studentId ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAdjOpen(true)}>
              Điều chỉnh
            </Button>
            <Button onClick={() => setPayOpen(true)}>
              <Plus aria-hidden="true" /> Thu tiền
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-2">
        <Select aria-label="Học sinh" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-48">
          <option value="">— Chọn học sinh —</option>
          {(students.data?.items ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Tháng" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-28">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              Tháng {m}
            </option>
          ))}
        </Select>
        <Select aria-label="Năm" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24">
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      {!studentId ? (
        <EmptyState title={vi.empty} hint="Chọn học sinh để xem bảng kê học phí theo tháng." />
      ) : statement.isLoading ? (
        <div className="flex flex-col gap-2" aria-label={vi.loading}>
          <Skeleton className="h-10" /> <Skeleton className="h-10" /> <Skeleton className="h-10" />
        </div>
      ) : statement.isError || !statement.data ? (
        <p role="alert" className="text-sm text-red-600">Không tải được bảng kê. Thử lại.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardTitle>Học phí buổi học</CardTitle>
              <p className="mt-1 text-2xl font-bold">{formatVnd(statement.data.lessonTotalVnd)}</p>
              <p className="text-xs text-slate-500">{statement.data.lessons.length} buổi đã hoàn thành</p>
            </Card>
            <Card>
              <CardTitle>Điều chỉnh</CardTitle>
              <p className="mt-1 text-2xl font-bold">{formatVnd(statement.data.adjustmentTotalVnd)}</p>
            </Card>
            <Card>
              <CardTitle>Đã thu</CardTitle>
              <p className="mt-1 text-2xl font-bold">{formatVnd(statement.data.paidTotalVnd)}</p>
            </Card>
            <Card>
              <CardTitle>{statement.data.balanceVnd > 0 ? 'Còn nợ' : statement.data.balanceVnd < 0 ? 'Thừa' : 'Đã đủ'}</CardTitle>
              <p className="mt-1 text-2xl font-bold">{formatVnd(Math.abs(statement.data.balanceVnd))}</p>
              <p className="text-xs text-slate-500">Phải thu {formatVnd(statement.data.amountDueVnd)}</p>
            </Card>
          </div>

          <Card>
            <CardTitle>Chi tiết buổi học</CardTitle>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-1 font-medium">Ngày</th>
                    <th className="font-medium">Môn</th>
                    <th className="font-medium">Phút</th>
                    <th className="font-medium">Học phí</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.data.lessons.map((l) => (
                    <tr key={l.id} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="py-1">{new Date(l.scheduledStart).toLocaleDateString('vi-VN')}</td>
                      <td>{l.subject}</td>
                      <td>
                        {l.scheduledMinutes}′ → {l.actualMinutes}′
                        {l.bonusMinutes > 0 ? <Badge tone={l.bonusBillable ? 'warning' : 'info'}>+{l.bonusMinutes}′</Badge> : null}
                      </td>
                      <td>{formatVnd(l.tuitionVnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardTitle>Lịch sử thanh toán</CardTitle>
            <div className="mt-2 flex flex-col gap-2">
              {(payments.data ?? []).map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{formatVnd(p.amountVnd)}</span>
                  <span className="text-slate-500">{new Date(p.paidAt).toLocaleDateString('vi-VN')}</span>
                  {p.note ? <span className="text-slate-500">{p.note}</span> : null}
                  {p.corrections.length > 0 ? (
                    <Badge tone="warning">Đã sửa {p.corrections.length} lần ({p.corrections.map((c) => `${formatVnd(c.previousAmountVnd)}→${formatVnd(c.newAmountVnd)}`).join(', ')})</Badge>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => setCorrecting({ id: p.id, amount: p.amountVnd })}>
                    Sửa
                  </Button>
                </div>
              ))}
              {(payments.data ?? []).length === 0 ? <p className="text-sm text-slate-500">Chưa có thanh toán.</p> : null}
            </div>
          </Card>
        </>
      )}

      {payOpen && studentId ? <PaymentDialog studentId={studentId} onClose={() => setPayOpen(false)} /> : null}
      {adjOpen && studentId ? <AdjustmentDialog studentId={studentId} onClose={() => setAdjOpen(false)} /> : null}
      {correcting ? <CorrectDialog paymentId={correcting.id} current={correcting.amount} onClose={() => setCorrecting(null)} /> : null}
    </Page>
  );
}
