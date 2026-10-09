import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

import type { CompleteLessonDto, Subject } from '@tutor-manager/shared';

export interface LessonItem {
  id: string;
  studentId: string;
  scheduledStart: string;
  scheduledMinutes: number;
  subject: Subject;
  actualMinutes?: number | null;
  bonusMinutes: number;
  bonusBillable: boolean;
  billingPolicy: 'actual' | 'planned';
  billableMinutes: number;
  hourlyRateVnd: number;
  tuitionVnd: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  timeZone: string;
  student?: { id: string; name: string };
}

export interface LessonListParams {
  from?: string;
  to?: string;
  studentId?: string;
  subject?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'all';
}

export const lessonKeys = {
  all: ['lessons'] as const,
  list: (params: LessonListParams) => [...lessonKeys.all, 'list', params] as const,
};

export function useLessons(params: LessonListParams) {
  return useQuery({
    queryKey: lessonKeys.list(params),
    queryFn: () => {
      const q = new URLSearchParams();
      if (params.from) q.set('from', params.from);
      if (params.to) q.set('to', params.to);
      if (params.studentId) q.set('studentId', params.studentId);
      if (params.subject) q.set('subject', params.subject);
      if (params.status) q.set('status', params.status);
      const suffix = q.toString();
      return apiFetch<{ total: number; items: LessonItem[] }>(`/api/lessons${suffix ? `?${suffix}` : ''}`);
    },
  });
}

function useInvalidateLessons() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: lessonKeys.all });
}

export function useCreateLesson() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: (dto: { studentId: string; scheduledStart: string; scheduledMinutes: number; subject: Subject; timeZone?: string }) =>
      apiFetch<LessonItem>('/api/lessons', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateLesson() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { scheduledStart?: string; scheduledMinutes?: number; subject?: Subject } }) =>
      apiFetch<LessonItem>(`/api/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    onSuccess: () => invalidate(),
  });
}

export function useCancelLesson() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: (id: string) => apiFetch<LessonItem>(`/api/lessons/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => invalidate(),
  });
}

export function useCompleteLesson() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CompleteLessonDto }) =>
      apiFetch<LessonItem>(`/api/lessons/${id}/complete`, { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => invalidate(),
  });
}
