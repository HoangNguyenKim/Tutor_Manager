export type RouteKey =
  | 'dashboard'
  | 'students'
  | 'calendar'
  | 'hours'
  | 'tuition'
  | 'reports'
  | 'settings';

export const routes: { key: RouteKey; hash: string }[] = [
  { key: 'dashboard', hash: '#/' },
  { key: 'students', hash: '#/students' },
  { key: 'calendar', hash: '#/calendar' },
  { key: 'hours', hash: '#/hours' },
  { key: 'tuition', hash: '#/tuition' },
  { key: 'reports', hash: '#/reports' },
  { key: 'settings', hash: '#/settings' },
];

export function routeFromHash(hash: string): RouteKey {
  const found = routes.find((r) => r.hash === hash);
  return found ? found.key : 'dashboard';
}

export const vi = {
  appName: 'Tutor Manager',
  dashboard: 'Tổng quan',
  students: 'Học sinh',
  calendar: 'Lịch học',
  hours: 'Giờ dạy',
  tuition: 'Học phí',
  reports: 'Báo cáo',
  settings: 'Cài đặt',
  search: 'Tìm kiếm',
  theme: 'Giao diện',
  light: 'Sáng',
  dark: 'Tối',
  backend: 'Backend',
  online: 'Đang chạy',
  offline: 'Ngoại tuyến',
  add: 'Thêm mới',
  save: 'Lưu',
  cancel: 'Hủy',
  close: 'Đóng',
  retry: 'Thử lại',
  empty: 'Chưa có dữ liệu',
  loading: 'Đang tải…',
  skipToContent: 'Bỏ qua tới nội dung chính',
};

/** Dynamic lookup with fallback for route-driven titles. */
export function t(key: string): string {
  return (vi as Record<string, string>)[key] ?? key;
}
