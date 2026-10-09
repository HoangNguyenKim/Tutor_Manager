import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateStudentDto, UpdateStudentDto } from '@tutor-manager/shared';
import { studentsApi, type StudentListParams } from '../api/client';

export const studentKeys = {
  all: ['students'] as const,
  list: (params: StudentListParams) => [...studentKeys.all, 'list', params] as const,
  detail: (id: string) => [...studentKeys.all, 'detail', id] as const,
};

export function useStudents(params: StudentListParams) {
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => studentsApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: studentKeys.detail(id ?? ''),
    queryFn: () => studentsApi.get(id as string, true),
    enabled: !!id,
  });
}

function useInvalidateStudents() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: studentKeys.all });
}

export function useCreateStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: (dto: CreateStudentDto) => studentsApi.create(dto),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateStudent(id: string) {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: (dto: UpdateStudentDto) => studentsApi.update(id, dto),
    onSuccess: () => invalidate(),
  });
}

export function useArchiveStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: (id: string) => studentsApi.archive(id),
    onSuccess: () => invalidate(),
  });
}

export function useRestoreStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: (id: string) => studentsApi.restore(id),
    onSuccess: () => invalidate(),
  });
}
