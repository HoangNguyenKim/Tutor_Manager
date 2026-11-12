import { useId, useState } from 'react';
import type { RangeParams, RangePreset } from '../hooks/useReports';
import { Button } from './Button';
import { Input, Label, Select } from './Field';

function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function customRange(from: string, to: string): { params?: RangeParams; error?: string } {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    localDate(start) !== from ||
    localDate(end) !== to
  )
    return { error: 'Vui lòng nhập đầy đủ ngày hợp lệ.' };
  if (start > end) return { error: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.' };
  return { params: { preset: 'custom', from: start.toISOString(), to: end.toISOString() } };
}

export function DateRange({
  params,
  onChange,
}: {
  params: RangeParams;
  onChange: (params: RangeParams) => void;
}) {
  const id = useId();
  const [preset, setPreset] = useState<RangePreset>(params.preset);
  const [from, setFrom] = useState(params.from ? localDate(new Date(params.from)) : localDate());
  const [to, setTo] = useState(params.to ? localDate(new Date(params.to)) : localDate());
  const result = customRange(from, to);
  const pending =
    preset === 'custom' &&
    (params.preset !== 'custom' ||
      result.params?.from !== params.from ||
      result.params?.to !== params.to);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor={`${id}-preset`}>Khoảng thời gian</Label>
        <Select
          id={`${id}-preset`}
          value={preset}
          onChange={(event) => {
            const next = event.target.value as RangePreset;
            setPreset(next);
            if (next !== 'custom') onChange({ preset: next });
          }}
          className="w-40"
        >
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
          <option value="custom">Tùy chọn</option>
        </Select>
      </div>
      {preset === 'custom' && (
        <>
          <div>
            <Label htmlFor={`${id}-from`}>Từ ngày</Label>
            <Input
              id={`${id}-from`}
              type="date"
              value={from}
              aria-invalid={Boolean(result.error)}
              aria-describedby={`${id}-hint`}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`${id}-to`}>Đến ngày</Label>
            <Input
              id={`${id}-to`}
              type="date"
              value={to}
              min={from || undefined}
              aria-invalid={Boolean(result.error)}
              aria-describedby={`${id}-hint`}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            disabled={Boolean(result.error) || !pending}
            onClick={() => {
              if (result.params) onChange(result.params);
            }}
          >
            Áp dụng
          </Button>
          <p
            id={`${id}-hint`}
            className={`w-full text-xs ${result.error ? 'text-red-700 dark:text-red-300' : 'tm-muted'}`}
            role={result.error ? 'alert' : 'status'}
          >
            {result.error ??
              (pending
                ? 'Bộ lọc chưa áp dụng. Chọn ngày và nhấn Áp dụng để cập nhật kết quả.'
                : 'Đã áp dụng khoảng ngày, bao gồm toàn bộ ngày kết thúc.')}
          </p>
        </>
      )}
    </div>
  );
}
