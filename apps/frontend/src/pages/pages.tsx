import { CalendarDays, Moon, Sun } from 'lucide-react';
import { vi } from '../i18n';
import { Button } from '../components/Button';
import { Card, CardTitle } from '../components/Card';
import { Page } from '../layout/Page';
import { useTheme } from '../theme';
export function SettingsPage() {
  const { theme, toggle } = useTheme();
  return (
    <Page title={vi.settings}>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Giao diện</CardTitle>
            <p className="tm-muted mt-2 text-sm">
              Chọn không gian sáng hoặc tối. Lựa chọn được lưu trên thiết bị này khi trình duyệt cho
              phép.
            </p>
          </div>
          <Button variant="secondary" onClick={toggle} aria-pressed={theme === 'dark'}>
            {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            {theme === 'dark' ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
          </Button>
        </div>
      </Card>
      <Card>
        <div className="flex items-start gap-4">
          <span className="tm-icon-tile">
            <CalendarDays className="size-5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Đồng bộ Google Calendar</CardTitle>
            <p className="tm-count mt-3">Chưa được kết nối</p>
            <p className="tm-muted mt-3 max-w-2xl text-sm leading-relaxed">
              Tính năng đồng bộ chưa được triển khai trong phiên bản này. Lịch dạy vẫn được quản lý
              trong ứng dụng; chưa có dữ liệu nào được gửi đến Google Calendar.
            </p>
            <p className="tm-muted mt-2 max-w-2xl text-sm leading-relaxed">
              Khi được hỗ trợ, chỉ thông tin lịch dự kiến được đồng bộ, không bao gồm học phí, thanh
              toán hoặc giờ thực dạy.
            </p>
          </div>
        </div>
      </Card>
    </Page>
  );
}
