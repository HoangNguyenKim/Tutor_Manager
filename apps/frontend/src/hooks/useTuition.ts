import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MonthlyStatementDto, PaymentDto } from '@tutor-manager/shared';
import { apiFetch } from '../api/client';

export const tuitionKeys = {
  all: ['tuition'] as const,
  statement: (studentId: string, year: number, month: number) =>
    [...tuitionKeys.all, 'statement', studentId, year, month] as const,
  payments: (studentId: string) => [...tuitionKeys.all, 'payments', studentId] as const,
};

export function useStatement(studentId: string | undefined, year: number, month: number) {
  return useQuery({
    queryKey: tuitionKeys.statement(studentId ?? '', year, month),
    queryFn: () => apiFetch<MonthlyStatementDto>(`/api/students/${studentId}/statement?year=${year}&month=${month}`),
    enabled: !!studentId,
  });
}

export function usePayments(studentId: string | undefined) {
  return useQuery({
    queryKey: tuitionKeys.payments(studentId ?? ''),
    queryFn: () => apiFetch<PaymentDto[]>(`/api/students/${studentId}/payments`),
    enabled: !!studentId,
  });
}

function useInvalidateTuition() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: tuitionKeys.all });
    qc.invalidateQueries({ queryKey: ['lessons'] });
  };
}

export function useCreatePayment() {
  const invalidate = useInvalidateTuition();
  return useMutation({
    mutationFn: (dto: { studentId: string; amountVnd: number; paidAt: string; note?: string; idempotencyKey?: string }) =>
      apiFetch<{ payment: PaymentDto; duplicate: boolean }>('/api/payments', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => invalidate(),
  });
}

export function useCorrectPayment() {
  const invalidate = useInvalidateTuition();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { newAmountVnd: number; reason: string } }) =>
      apiFetch(`/api/payments/${id}/correct`, { method: 'PATCH', body: JSON.stringify(dto) }),
    onSuccess: () => invalidate(),
  });
}

export function useCreateAdjustment() {
  const invalidate = useInvalidateTuition();
  return useMutation({
    mutationFn: (dto: { studentId: string; amountVnd: number; reason: string }) =>
      apiFetch('/api/adjustments', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => invalidate(),
  });
}
