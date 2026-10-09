export interface HealthStatus {
  ok: boolean;
  service: string;
  time: string;
}

export interface ApiPing {
  message: string;
}

export const BACKEND_HOST = '127.0.0.1';
export const BACKEND_PORT = 3001;
export const backendUrl = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export type LessonStatus = 'scheduled' | 'completed' | 'cancelled';

export interface StudentDto {
  id: string;
  name: string;
  phone?: string | null;
  parentContact?: string | null;
  grade?: string | null;
  subject?: string | null;
  hourlyRateVnd?: number | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentDto {
  name: string;
  phone?: string;
  parentContact?: string;
  grade?: string;
  subject?: string;
  hourlyRateVnd?: number;
  notes?: string;
}

export interface UpdateStudentDto {
  name?: string;
  phone?: string;
  parentContact?: string;
  grade?: string;
  subject?: string;
  hourlyRateVnd?: number;
  notes?: string;
}

export interface StudentListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: StudentDto[];
}

export interface LessonItemDto {
  id: string;
  studentId: string;
  scheduledStart: string;
  scheduledMinutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  timeZone: string;
  student?: { id: string; name: string; subject?: string | null };
}

export interface CreateLessonDto {
  studentId: string;
  scheduledStart: string;
  scheduledMinutes: number;
  timeZone?: string;
  hourlyRateVnd?: number;
}

export interface UpdateLessonDto {
  scheduledStart?: string;
  scheduledMinutes?: number;
  timeZone?: string;
}

export interface LessonListResponse {
  total: number;
  items: LessonItemDto[];
}

