// A synchronous gate closes the gap before React renders isPending=true.
export function createSubmissionGate() {
  let pending = false;
  return {
    get pending() { return pending; },
    async run<T>(action: () => Promise<T>): Promise<T | undefined> {
      if (pending) return undefined;
      pending = true;
      try { return await action(); }
      finally { pending = false; }
    },
  };
}

// Keep the key after a network failure: the server may already have saved it.
export function createPaymentAttempt(makeKey: () => string) {
  const keys = new Map<string, string>();
  return {
    keyFor(payload: unknown): string {
      const signature = JSON.stringify(payload);
      let key = keys.get(signature);
      if (!key) { key = makeKey(); keys.set(signature, key); }
      return key;
    },
  };
}

export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function parseLocalDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !parseDateInput(value.slice(0, 10))) return null;
  const date = new Date(value);
  const hour = Number(value.slice(11, 13));
  const minute = Number(value.slice(14, 16));
  // Reject rolled dates, invalid clock values and nonexistent local DST times.
  return Number.isFinite(date.getTime()) && date.getHours() === hour && date.getMinutes() === minute
    && date.getDate() === Number(value.slice(8, 10)) ? date : null;
}

export function validatePayment(amount: string, paidAt: string, note: string, today: string): string | null {
  if (integerInput(amount, 1) === null) return 'Số tiền phải là số nguyên VND từ 1, không dùng dấu phân cách hoặc ký hiệu khoa học.';
  if (!parseDateInput(paidAt)) return 'Vui lòng chọn ngày thu hợp lệ.';
  if (paidAt > today) return 'Ngày thu không được sau hôm nay.';
  if (note.trim().length > 500) return 'Ghi chú tối đa 500 ký tự.';
  return null;
}

export function validateReason(reason: string): string | null {
  if (!reason.trim()) return 'Vui lòng nhập lý do để lưu vết điều chỉnh.';
  if (reason.trim().length > 500) return 'Lý do tối đa 500 ký tự.';
  return null;
}

export function lessonDefaults(initial?: { studentId?: string; subject?: string; scheduledMinutes?: number } | null) {
  return { studentId: initial?.studentId ?? '', subject: initial?.subject ?? 'Toán', minutes: String(initial?.scheduledMinutes ?? 60) };
}

export interface StudentValues {
  name: string;
  phone: string;
  parentContact: string;
  grade: string;
  hourlyRateVnd: string;
  notes: string;
}

export function integerInput(value: string, min: number, max = Number.MAX_SAFE_INTEGER): number | null {
  const text = value.trim();
  if (!/^-?\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}

export function validateStudent(values: StudentValues): string | null {
  if (!values.name.trim()) return 'Tên học sinh là bắt buộc.';
  const limits = { name: 120, phone: 30, parentContact: 120, grade: 30, notes: 2000 } as const;
  const labels = { name: 'Tên học sinh', phone: 'Điện thoại', parentContact: 'Liên hệ phụ huynh', grade: 'Khối lớp', notes: 'Ghi chú' };
  for (const field of Object.keys(limits) as (keyof typeof limits)[]) {
    if (values[field].trim().length > limits[field]) return `${labels[field]} tối đa ${limits[field]} ký tự.`;
  }
  const phone = values.phone.trim();
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || !/^\d{8,15}$/.test(phone.replace(/\D/g, '')))) {
    return 'Điện thoại cần 8–15 chữ số; có thể dùng dấu +, khoảng trắng, ngoặc hoặc gạch nối.';
  }
  if (values.hourlyRateVnd.trim() && integerInput(values.hourlyRateVnd, 0) === null) {
    return 'Học phí giờ phải là số nguyên VND từ 0, không dùng dấu phân cách hoặc ký hiệu khoa học.';
  }
  return null;
}
