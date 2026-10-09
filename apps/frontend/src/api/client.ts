import type {
  ApiResponse,
  CreateStudentDto,
  HealthStatus,
  StudentDto,
  StudentListResponse,
  UpdateStudentDto,
} from '@tutor-manager/shared';

async function baseUrl(): Promise<string> {
  const bridge = window.tutorManager;
  if (bridge) {
    try {
      return await bridge.getBackendUrl();
    } catch {
      // fall through to relative proxy
    }
  }
  return '';
}

async function authToken(): Promise<string | undefined> {
  const bridge = window.tutorManager;
  if (bridge?.getAuthToken) {
    try {
      return await bridge.getAuthToken();
    } catch {
      // fall through to env token
    }
  }
  const envToken = import.meta.env['VITE_DEV_TOKEN'];
  return typeof envToken === 'string' && envToken.length > 0 ? envToken : undefined;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const [base, token] = await Promise.all([baseUrl(), authToken()]);
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.ok) {
    throw new ApiError(res.status, body.error?.code ?? 'UNKNOWN', body.error?.message ?? `Request failed: ${res.status}`, body.error?.details);
  }
  return body.data as T;
}

export async function fetchHealth(): Promise<ApiResponse<HealthStatus>> {
  const base = await baseUrl();
  const res = await fetch(`${base}/api/health`);
  if (!res.ok) throw new Error(`health failed: ${res.status}`);
  return res.json() as Promise<ApiResponse<HealthStatus>>;
}

export interface StudentListParams {
  search?: string;
  status?: 'active' | 'archived' | 'all';
  subject?: string;
  page?: number;
  pageSize?: number;
}

export const studentsApi = {
  list(params: StudentListParams): Promise<StudentListResponse> {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.subject) q.set('subject', params.subject);
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    const suffix = q.toString();
    return apiFetch<StudentListResponse>(`/api/students${suffix ? `?${suffix}` : ''}`);
  },
  get(id: string, includeCounts = false): Promise<{ student: StudentDto; lessonCount?: number; paymentCount?: number }> {
    return apiFetch(`/api/students/${id}${includeCounts ? '?includeCounts=true' : ''}`);
  },
  create(dto: CreateStudentDto): Promise<StudentDto> {
    return apiFetch<StudentDto>('/api/students', { method: 'POST', body: JSON.stringify(dto) });
  },
  update(id: string, dto: UpdateStudentDto): Promise<StudentDto> {
    return apiFetch<StudentDto>(`/api/students/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
  },
  archive(id: string): Promise<StudentDto> {
    return apiFetch<StudentDto>(`/api/students/${id}/archive`, { method: 'POST' });
  },
  restore(id: string): Promise<StudentDto> {
    return apiFetch<StudentDto>(`/api/students/${id}/restore`, { method: 'POST' });
  },
};

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export function formatVnd(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return vnd.format(value);
}
