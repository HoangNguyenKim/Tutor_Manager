import { vi } from '../i18n';
import { Button } from '../components/Button';
import { Card, CardTitle } from '../components/Card';
import { Label } from '../components/Field';
import { Page } from '../layout/Page';
import { useToast } from '../toast';

export function SettingsPage() {
  const { push } = useToast();
  return (
    <Page title={vi.settings}>
      <Card>
        <CardTitle>Đồng bộ Google Calendar (tùy chọn)</CardTitle>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Chỉ đồng bộ thông tin lịch dự kiến. Không gửi học phí, thanh toán, giờ thực dạy.
        </p>
        <form
          className="mt-3 flex max-w-sm flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            push('Đã lưu cài đặt (bản demo).');
          }}
        >
          <div>
            <Label htmlFor="sync">Chế độ đồng bộ</Label>
            <select id="sync" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="off">Tắt</option>
              <option value="push">Chỉ đẩy lịch dự kiến</option>
            </select>
          </div>
          <div>
            <Button type="submit">{vi.save}</Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
