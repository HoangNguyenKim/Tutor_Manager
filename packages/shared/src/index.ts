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

export const SUBJECTS = ['Toán', 'Văn', 'Anh', 'Sinh', 'Hóa', 'Lý'] as const;

export type Subject = (typeof SUBJECTS)[number];

export interface StudentDto {
  id: string;
  name: string;
  phone?: string | null;
  parentContact?: string | null;
  grade?: string | null;
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
  hourlyRateVnd?: number;
  notes?: string;
}

export interface UpdateStudentDto {
  name?: string;
  phone?: string;
  parentContact?: string;
  grade?: string;
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

export interface CompleteLessonDto {
  actualMinutes: number;
  bonusBillable?: boolean;
  billingPolicy?: 'actual' | 'planned';
}

export interface CreateLessonDto {
  studentId: string;
  scheduledStart: string;
  scheduledMinutes: number;
  subject: Subject;
  timeZone?: string;
  hourlyRateVnd?: number;
}

export interface UpdateLessonDto {
  scheduledStart?: string;
  scheduledMinutes?: number;
  subject?: Subject;
  timeZone?: string;
}

export interface LessonListResponse {
  total: number;
  items: LessonItemDto[];
}

export interface StatementLessonDto {
  id: string;
  scheduledStart: string;
  subject: Subject;
  scheduledMinutes: number;
  actualMinutes: number | null;
  bonusMinutes: number;
  bonusBillable: boolean;
  billableMinutes: number;
  hourlyRateVnd: number;
  tuitionVnd: number;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface MonthlyStatementDto {
  studentId: string;
  year: number;
  month: number;
  lessons: StatementLessonDto[];
  lessonTotalVnd: number;
  adjustments: { id: string; amountVnd: number; reason: string }[];
  adjustmentTotalVnd: number;
  amountDueVnd: number;
  payments: { id: string; amountVnd: number; paidAt: string }[];
  paidTotalVnd: number;
  balanceVnd: number;
}

export interface PaymentDto {
  id: string;
  studentId: string;
  amountVnd: number;
  paidAt: string;
  note?: string | null;
  idempotencyKey?: string | null;
  corrections: { id: string; previousAmountVnd: number; newAmountVnd: number; reason: string; createdAt: string }[];
}

