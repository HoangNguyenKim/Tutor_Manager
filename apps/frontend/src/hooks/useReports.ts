import { useQuery } from '@tanstack/react-query';
import type { BonusReportDto, MonthlyReportDto, OverviewDto, PaymentReportDto } from '@tutor-manager/shared';
import { apiFetch } from '../api/client';

export type RangePreset = 'week' | 'month' | 'custom';

export interface RangeParams {
  preset: RangePreset;
  from?: string;
  to?: string;
}

function rangeQuery(params: RangeParams): string {
  const q = new URLSearchParams({ preset: params.preset });
  if (params.preset === 'custom' && params.from && params.to) {
    q.set('from', params.from);
    q.set('to', params.to);
  }
  return q.toString();
}

export function useOverview(params: RangeParams) {
  return useQuery({
    queryKey: ['reports', 'overview', params],
    queryFn: () => apiFetch<OverviewDto>(`/api/reports/overview?${rangeQuery(params)}`),
  });
}

export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: ['reports', 'monthly', year, month],
    queryFn: () => apiFetch<MonthlyReportDto>(`/api/reports/monthly?year=${year}&month=${month}`),
  });
}

export function useBonusReport(params: RangeParams) {
  return useQuery({
    queryKey: ['reports', 'bonus', params],
    queryFn: () => apiFetch<BonusReportDto>(`/api/reports/bonus?${rangeQuery(params)}`),
  });
}

export function usePaymentReport(params: RangeParams) {
  return useQuery({
    queryKey: ['reports', 'payments', params],
    queryFn: () => apiFetch<PaymentReportDto>(`/api/reports/payments?${rangeQuery(params)}`),
  });
}

export function useStudentHistory(studentId: string | undefined, params: RangeParams) {
  return useQuery({
    queryKey: ['reports', 'history', studentId, params],
    queryFn: () =>
      apiFetch<{ lessons: unknown[]; payments: unknown[]; adjustments: unknown[] }>(
        `/api/reports/students/${studentId}/history?${rangeQuery(params)}`,
      ),
    enabled: !!studentId,
  });
}
