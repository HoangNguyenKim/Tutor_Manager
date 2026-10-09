import { useEffect, useState } from 'react';
import { ArrowDownUp, Eye, Pencil, Plus, RotateCcw } from 'lucide-react';
import type { StudentDto } from '@tutor-manager/shared';
import { formatVnd } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { EmptyState, Skeleton } from '../components/Feedback';
import { Input, Label, Select } from '../components/Field';
import { useArchiveStudent, useCreateStudent, useRestoreStudent, useStudent, useStudents, useUpdateStudent } from '../hooks/useStudents';
import { vi } from '../i18n';
import { Page } from '../layout/Page';
import { useToast } from '../toast';
import { StudentForm } from './StudentForm';

type SortKey = 'name' | 'subject' | 'rate';

function sortItems(items: StudentDto[], key: SortKey): StudentDto[] {
  const copy = [...items];
  if (key === 'name') copy.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  if (key === 'subject') copy.sort((a, b) => (a.subject ?? '').localeCompare(b.subject ?? '', 'vi'));
  if (key === 'rate') copy.sort((a, b) => (b.hourlyRateVnd ?? -1) - (a.hourlyRateVnd ?? -1));
  return copy;
}

function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onClose, pending }: { open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; pending: boolean }) {
  if (!open) return null;
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm">{body}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {vi.cancel}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={pending}>
          {pending ? vi.loading : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

function StudentDetail({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: () => void }) {
  const { data, isLoading, isError, refetch } = useStudent(id);
  return (
    <Dialog open onClose={onClose} title="Chi tiết học sinh">
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton /> <Skeleton /> <Skeleton />
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-sm text-red-600">Không tải được. Thử lại.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            {vi.retry}
          </Button>
        </div>
      ) : (
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Tên</dt><dd className="font-medium">{data.student.name}</dd></div>
          <div><dt className="text-slate-500">Trạng thái</dt><dd>{data.student.isActive ? <Badge tone="success">Đang học</Badge> : <Badge tone="neutral">Đã lưu trữ</Badge>}</dd></div>
          <div><dt className="text-slate-500">Môn</dt><dd>{data.student.subject ?? '—'}</dd></div>
          <div><dt className="text-slate-500">Khối</dt><dd>{data.student.grade ?? '—'}</dd></div>
          <div><dt className="text-slate-500">Học phí giờ</dt><dd>{formatVnd(data.student.hourlyRateVnd)}</dd></div>
          <div><dt className="text-slate-500">Điện thoại</dt><dd>{data.student.phone ?? '—'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-slate-500">Phụ huynh</dt><dd>{data.student.parentContact ?? '—'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-slate-500">Ghi chú</dt><dd>{data.student.notes ?? '—'}</dd></div>
          <div><dt className="text-slate-500">Buổi học</dt><dd>{data.lessonCount ?? '—'}</dd></div>
          <div><dt className="text-slate-500">Thanh toán</dt><dd>{data.paymentCount ?? '—'}</dd></div>
        </dl>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={onEdit}>
          <Pencil aria-hidden="true" /> Sửa
        </Button>
      </div>
    </Dialog>
  );
}

export function StudentsPage() {
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(h);
  }, [search]);
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [subject, setSubject] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const list = useStudents({
    search: debounced || undefined,
    status,
    subject: subject.trim() || undefined,
    page: 1,
    pageSize: 50,
  });
  const create = useCreateStudent();
  const update = useUpdateStudent(editId ?? '');
  const archive = useArchiveStudent();
  const restore = useRestoreStudent();
  const editing = useStudent(editId ?? undefined);

  const items = list.data ? sortItems(list.data.items, sort) : [];

  return (
    <Page
      title={vi.students}
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden="true" /> {vi.add}
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <div className="min-w-40 flex-1">
          <Label htmlFor="stu-search" className="sr-only">{vi.search}</Label>
          <Input
            id="stu-search"
            placeholder={`${vi.search} tên, SĐT…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select aria-label="Môn học" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-32">
          <option value="">Mọi môn</option>
          <option value="Toán">Toán</option>
          <option value="Lý">Lý</option>
          <option value="Hóa">Hóa</option>
          <option value="Tiếng Anh">Tiếng Anh</option>
        </Select>
        <Select aria-label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-32">
          <option value="active">Đang học</option>
          <option value="archived">Lưu trữ</option>
          <option value="all">Tất cả</option>
        </Select>
        <Button variant="secondary" onClick={() => setSort((s) => (s === 'name' ? 'subject' : s === 'subject' ? 'rate' : 'name'))} title="Đổi sắp xếp">
          <ArrowDownUp aria-hidden="true" /> {sort === 'name' ? 'Tên' : sort === 'subject' ? 'Môn' : 'Học phí'}
        </Button>
      </div>

      {list.isLoading ? (
        <div className="flex flex-col gap-2" aria-label={vi.loading}>
          <Skeleton className="h-10" /> <Skeleton className="h-10" /> <Skeleton className="h-10" />
        </div>
      ) : list.isError ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-red-600">Không tải được danh sách. Kiểm tra backend rồi thử lại.</p>
          <Button variant="secondary" onClick={() => list.refetch()}>{vi.retry}</Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={vi.empty} hint="Nhấn Thêm mới để tạo hồ sơ học sinh đầu tiên." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Tên</th>
                <th scope="col" className="px-4 py-2 font-medium">Môn</th>
                <th scope="col" className="px-4 py-2 font-medium">Khối</th>
                <th scope="col" className="px-4 py-2 font-medium">Học phí giờ</th>
                <th scope="col" className="px-4 py-2 font-medium">Trạng thái</th>
                <th scope="col" className="px-4 py-2 font-medium"><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2">{s.subject ?? '—'}</td>
                  <td className="px-4 py-2">{s.grade ?? '—'}</td>
                  <td className="px-4 py-2">{formatVnd(s.hourlyRateVnd)}</td>
                  <td className="px-4 py-2">
                    {s.isActive ? <Badge tone="success">Đang học</Badge> : <Badge tone="neutral">Lưu trữ</Badge>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Chi tiết" aria-label={`Chi tiết ${s.name}`} onClick={() => setDetailId(s.id)}>
                        <Eye aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Sửa" aria-label={`Sửa ${s.name}`} onClick={() => setEditId(s.id)}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      {s.isActive ? (
                        <Button variant="ghost" size="icon" title="Lưu trữ" aria-label={`Lưu trữ ${s.name}`} onClick={() => setArchiveId(s.id)}>
                          <RotateCcw aria-hidden="true" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Khôi phục"
                          aria-label={`Khôi phục ${s.name}`}
                          onClick={() => restore.mutate(s.id, { onSuccess: () => push(`Đã khôi phục ${s.name}.`) })}
                        >
                          <RotateCcw aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data ? <p className="text-xs text-slate-500">Tổng {list.data.total} học sinh.</p> : null}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={`${vi.add} — ${vi.students}`}>
        <StudentForm
          pending={create.isPending}
          submitLabel={vi.save}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async (dto) => {
            await create.mutateAsync(dto);
            setCreateOpen(false);
            push('Đã thêm học sinh.');
          }}
        />
      </Dialog>

      <Dialog open={editId !== null} onClose={() => setEditId(null)} title={`Sửa — ${vi.students}`}>
        {editing.isLoading ? (
          <div className="flex flex-col gap-2"><Skeleton /> <Skeleton /></div>
        ) : editing.data ? (
          <StudentForm
            initial={editing.data.student}
            pending={update.isPending}
            submitLabel={vi.save}
            onCancel={() => setEditId(null)}
            onSubmit={async (dto) => {
              await update.mutateAsync(dto);
              setEditId(null);
              push('Đã lưu thay đổi.');
            }}
          />
        ) : (
          <p role="alert" className="text-sm text-red-600">Không tải được hồ sơ.</p>
        )}
      </Dialog>

      {detailId ? (
        <StudentDetail id={detailId} onClose={() => setDetailId(null)} onEdit={() => { setEditId(detailId); setDetailId(null); }} />
      ) : null}

      <ConfirmDialog
        open={archiveId !== null}
        title="Lưu trữ học sinh?"
        body="Hồ sơ được giữ lại cùng toàn bộ lịch sử buổi học và thanh toán. Có thể khôi phục sau."
        confirmLabel="Lưu trữ"
        pending={archive.isPending}
        onClose={() => setArchiveId(null)}
        onConfirm={() => {
          if (!archiveId) return;
          archive.mutate(archiveId, {
            onSuccess: () => {
              setArchiveId(null);
              push('Đã lưu trữ học sinh.');
            },
          });
        }}
      />
    </Page>
  );
}
