// Run against Vite: await (await import('/src/hooks/formInteractions.browser.test.mjs')).runFormTests()
// Uses real React/DOM/forms with an in-memory API transport; never writes a real database.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudentForm } from '../students/StudentForm.tsx';
import { StudentsPage } from '../students/StudentsPage.tsx';
import { TuitionPage } from '../tuition/TuitionPage.tsx';
import { CalendarPage } from '../calendar/CalendarPage.tsx';
import { CompleteLessonDialog } from '../calendar/CompleteLessonDialog.tsx';
import { HoursPage } from '../hours/HoursPage.tsx';
import { useCreatePayment } from './useTuition.ts';
import { useCreateStudent } from './useStudents.ts';
import { vi } from '../i18n.ts';

function MutationProbe({ useMutation, onReady }) {
  const mutation = useMutation();
  React.useEffect(() => onReady(mutation), [mutation, onReady]);
  return null;
}

const pause = () => new Promise(resolve => setTimeout(resolve, 60));
const assert = (value, message) => { if (!value) throw new Error(message); };
const student = { id: 'student-test', name: 'Nguyễn An', isActive: true, hourlyRateVnd: 200000 };
const lesson = { id: 'lesson-test', studentId: student.id, student, scheduledStart: new Date().toISOString(), scheduledMinutes: 90, subject: 'Anh', status: 'scheduled', billingPolicy: 'actual', bonusBillable: false, hourlyRateVnd: 200000 };
const statement = { lessons: [], adjustments: [], lessonTotalVnd: 0, adjustmentTotalVnd: 0, paidTotalVnd: 0, amountDueVnd: 0, balanceVnd: 0 };

export async function runFormTests() {
  const originalFetch = window.fetch;
  const originalConfirm = window.confirm;
  let confirmation = false;
  let confirmations = 0;
  window.confirm = () => { confirmations++; return confirmation; };
  const host = document.createElement('div');
  document.body.append(host);
  const results = [];
  let root;
  let requests = [];
  let paymentAttempts = 0;
  let failArchive = false;
  let failCancel = false;
  let failLessons = false;
  let activeClient;
  const envelope = data => new Response(JSON.stringify({ ok: true, data }), { headers: { 'content-type': 'application/json' } });
  window.fetch = async (url, init = {}) => {
    const path = String(url);
    if (init.method && init.method !== 'GET') {
      requests.push({ path, method: init.method, body: init.body ? JSON.parse(init.body) : undefined });
      await pause();
      if (path.endsWith('/cancel') && failCancel) return new Response(JSON.stringify({ ok: false, error: { code: 'UNKNOWN', message: 'Không hủy được. Thử lại.' } }), { status: 500 });
      if (path.endsWith('/archive') && failArchive) return new Response(JSON.stringify({ ok: false, error: { code: 'UNKNOWN', message: 'Test archive error' } }), { status: 500 });
      if (path === '/api/payments' && paymentAttempts++ === 0) throw new TypeError('Network response lost');
      return envelope(path === '/api/payments' ? { payment: {}, duplicate: true } : {});
    }
    if (path.includes('/statement')) return envelope(statement);
    if (path.includes('/payments')) return envelope([{ id: 'payment-test', amountVnd: 100, paidAt: '2026-01-01', corrections: [] }]);
    if (path.includes('/api/students')) return envelope({ items: [student], total: 1 });
    if (path.includes('/api/lessons')) return failLessons ? new Response(JSON.stringify({ ok: false, error: { code: 'UNKNOWN', message: 'Test load error' } }), { status: 500 }) : envelope({ items: [lesson], total: 1 });
    return envelope({});
  };
  async function mount(component) {
    root?.unmount();
    activeClient?.clear();
    host.replaceChildren();
    requests = [];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
    activeClient = client;
    root = createRoot(host);
    root.render(React.createElement(QueryClientProvider, { client }, component));
    await pause(); await pause();
  }
  async function change(selector, value) {
    const element = host.querySelector(selector);
    assert(element, `Missing field ${selector}`);
    const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    await pause();
  }
  async function button(text, scope = host) {
    const target = [...scope.querySelectorAll('button')].find(element => element.textContent.trim() === text);
    assert(target, `Missing button ${text}`);
    target.click(); await pause();
  }
  function submit() { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
  async function check(name, action) {
    try { await action(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  }
  try {
    await check('student validation blocks whitespace and numeric exponent, then saves trimmed data once', async () => {
      const calls = [];
      await mount(React.createElement(StudentForm, { pending: false, submitLabel: 'Lưu', onCancel() {}, onSubmit: async dto => { calls.push(dto); await pause(); } }));
      await change('#stu-name', '   '); submit(); await pause();
      assert(calls.length === 0 && host.querySelector('[role="alert"]'), 'Whitespace name submitted');
      await change('#stu-name', '  Nguyễn An  '); await change('#stu-rate', '1e5'); submit(); await pause();
      assert(calls.length === 0, 'Exponent rate submitted');
      await change('#stu-rate', '200000'); submit(); submit(); await pause(); await pause();
      assert(calls.length === 1 && calls[0].name === 'Nguyễn An', 'Duplicate or untrimmed student request');
    });
    await check('payment invalid date stays local; ambiguous network retry reuses key and double-submit is ignored', async () => {
      paymentAttempts = 0;
      await mount(React.createElement(TuitionPage));
      await change('select[aria-label="Học sinh"]', student.id); await button('Thu tiền');
      await change('#pay-amount', '100'); await change('#pay-date', ''); submit(); await pause();
      assert(requests.length === 0 && /ngày/i.test(host.querySelector('[role="alert"]')?.textContent ?? ''), 'Missing friendly date validation');
      await change('#pay-date', '2026-01-01'); submit(); submit(); await pause(); await pause();
      assert(requests.length === 1, 'Payment submitted twice');
      assert(host.querySelector('[role="alert"]'), 'Network failure did not keep form open');
      submit(); await pause(); await pause();
      assert(requests.length === 2 && requests[0].body.idempotencyKey === requests[1].body.idempotencyKey, 'Retry changed idempotency key');
    });
    await check('unchanged payment correction is blocked with Vietnamese explanation', async () => {
      await mount(React.createElement(TuitionPage));
      await change('select[aria-label="Học sinh"]', student.id); await pause(); await button('Sửa');
      await change('#corr-reason', 'Kiểm tra'); submit(); await pause();
      assert(requests.length === 0 && /khác|thay đổi/i.test(host.querySelector('[role="alert"]')?.textContent ?? ''), 'Unchanged correction was saved');
    });
    await check('corrections and signed adjustments require confirmation and keep API payloads trimmed', async () => {
      await mount(React.createElement(TuitionPage));
      await change('select[aria-label="Học sinh"]', student.id); await pause(); await button('Sửa');
      await change('#corr-amount', '150'); await change('#corr-reason', '  Thu bổ sung  ');
      confirmation = false; const before = confirmations; submit(); await pause();
      assert(confirmations === before + 1 && requests.length === 0, 'Correction bypassed confirmation');
      confirmation = true; submit(); submit(); await pause(); await pause();
      assert(requests.length === 1 && requests[0].body.reason === 'Thu bổ sung', 'Correction duplicate or untrimmed');
      await button('Điều chỉnh'); await change('#adj-amount', '-50');
      await change('#adj-reason', '   '); submit(); await pause();
      assert(requests.length === 1, 'Blank adjustment reason submitted');
      await change('#adj-reason', '  Giảm học phí  ');
      confirmation = false; submit(); await pause();
      assert(requests.length === 1, 'Declined adjustment submitted');
      confirmation = true; submit(); submit(); await pause(); await pause();
      assert(requests.length === 2 && requests[1].body.amountVnd === -50 && requests[1].body.reason === 'Giảm học phí', 'Adjustment duplicate or invalid payload');
    });
    await check('calendar edit saves original subject, duration and start exactly once', async () => {
      await mount(React.createElement(CalendarPage));
      host.querySelector('.fc-event').click(); await pause();
      assert(host.querySelector('#les-student')?.value === student.id, 'Edit lost student');
      submit(); submit(); await pause(); await pause();
      assert(requests.length === 1 && requests[0].method === 'PATCH', 'Edit did not save exactly once');
      assert(requests[0].body.subject === lesson.subject && requests[0].body.scheduledMinutes === lesson.scheduledMinutes, 'Edit overwrote original lesson values');
      assert(new Date(requests[0].body.scheduledStart).getTime() === Math.floor(new Date(lesson.scheduledStart).getTime() / 60000) * 60000, 'Edit changed original start minute');
    });
    await check('lesson editing retains original data and exposes cancellation inside the dialog with confirmation', async () => {
      await mount(React.createElement(CalendarPage));
      const event = host.querySelector('.fc-event'); assert(event, 'Calendar event missing');
      event.click(); await pause();
      assert(host.querySelector('#les-student')?.value === student.id, 'Edit lost student');
      assert(host.querySelector('#les-subject')?.value === 'Anh', 'Edit reset subject');
      assert(host.querySelector('#les-minutes')?.value === '90', 'Edit reset duration');
      await button('Hủy buổi học', host.querySelector('[role="dialog"]'));
      assert(requests.length === 0, 'Cancelled without confirmation');
      await button('Xác nhận hủy'); await pause();
      assert(requests.length === 1 && requests[0].path.endsWith('/cancel'), 'Confirmed cancellation missing');
    });
    await check('calendar cancellation failure remains visible and retries once after double click', async () => {
      await mount(React.createElement(CalendarPage));
      host.querySelector('.fc-event').click(); await pause();
      await button('Hủy buổi học'); failCancel = true;
      await button('Xác nhận hủy'); await pause(); await pause();
      assert(host.querySelector('[role="dialog"] [role="alert"]'), 'Cancel failure hidden or dialog lost');
      failCancel = false;
      const confirm = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Xác nhận hủy');
      confirm.click(); confirm.click(); await pause(); await pause();
      assert(requests.length === 2, 'Cancel retry duplicated');
    });
    await check('completed and cancelled lessons are read-only and cannot submit mutations', async () => {
      for (const status of ['completed', 'cancelled']) {
        lesson.status = status;
        await mount(React.createElement(CalendarPage));
        host.querySelector('.fc-event').click(); await pause();
        assert(host.querySelector('#les-minutes')?.disabled, 'History inputs editable');
        const dialog = host.querySelector('[role="dialog"]');
        assert(![...dialog.querySelectorAll('button')].some(b => ['Lưu', 'Hủy buổi học', 'Hoàn thành'].includes(b.textContent.trim())), 'Invalid status actions offered');
        submit(); await pause(); assert(requests.length === 0, 'History form submitted');
      }
      lesson.status = 'scheduled';
    });
    await check('calendar completion replaces edit dialog rather than stacking modals', async () => {
      lesson.status = 'scheduled';
      await mount(React.createElement(CalendarPage));
      host.querySelector('.fc-event').click(); await pause();
      await button('Hoàn thành');
      assert(host.querySelectorAll('[role="dialog"]').length === 1 && host.querySelector('#cmp-actual'), 'Completion modal missing or stacked');
    });
    await check('completion rejects exponent minutes and sends only one valid request', async () => {
      await mount(React.createElement(CompleteLessonDialog, { lesson, onClose() {} }));
      await change('#cmp-actual', '1e2'); submit(); await pause();
      assert(requests.length === 0, 'Exponent minutes submitted');
      await change('#cmp-actual', '100'); submit(); submit(); await pause(); await pause();
      assert(requests.length === 1 && requests[0].body.actualMinutes === 100, 'Completion duplicate or wrong minutes');
    });
    await check('lesson completion invalidates tuition, reports and student counts', async () => {
      await mount(React.createElement(CompleteLessonDialog, { lesson, onClose() {} }));
      const keys = [['tuition', 'statement-test'], ['reports', 'overview-test'], ['students', 'detail-test']];
      keys.forEach(key => activeClient.setQueryData(key, { cached: true }));
      submit(); await pause(); await pause(); await pause();
      assert(keys.every(key => activeClient.getQueryState(key)?.isInvalidated), 'Dependent billing/report/count caches stayed stale');
    });
    await check('archive failure stays visible and retry cannot send duplicate archive requests', async () => {
      await mount(React.createElement(StudentsPage));
      const archive = host.querySelector(`button[aria-label="Lưu trữ ${student.name}"]`);
      assert(archive, 'Missing archive action'); archive.click(); await pause();
      failArchive = true;
      await button('Lưu trữ'); await pause();
      assert(/Không.*lưu trữ/i.test(host.querySelector('[role="dialog"]')?.textContent ?? ''), 'Archive failure has no visible in-dialog feedback');
      failArchive = false;
      const confirm = [...host.querySelectorAll('button')].find(element => element.textContent.trim() === 'Lưu trữ');
      confirm.click(); confirm.click(); await pause(); await pause();
      assert(requests.length === 2, 'Archive retry submitted twice');
    });
    await check('payment and student mutations refresh dependent summaries and displayed names', async () => {
      for (const [useMutation, dto, keys] of [
        [useCreatePayment, { studentId: student.id, amountVnd: 100, paidAt: '2026-01-01T00:00:00.000Z' }, [['reports', 'overview-test'], ['students', 'detail-test']]],
        [useCreateStudent, { name: 'Nguyễn An' }, [['reports', 'overview-test'], ['lessons', 'name-test']]],
      ]) {
        let mutation;
        paymentAttempts = 1;
        await mount(React.createElement(MutationProbe, { useMutation, onReady(value) { mutation = value; } }));
        keys.forEach(key => activeClient.setQueryData(key, { cached: true }));
        await mutation.mutateAsync(dto);
        assert(keys.every(key => activeClient.getQueryState(key)?.isInvalidated), 'Dependent reports/student names stayed stale');
      }
    });
    await check('hours loading failure offers a working retry action', async () => {
      failLessons = true;
      await mount(React.createElement(HoursPage));
      assert(host.querySelector('[role="alert"]'), 'Missing hours load error');
      failLessons = false;
      await button(vi.retry); await pause();
      assert(!host.querySelector('[role="alert"]') && host.textContent.includes(student.name), 'Hours retry did not recover');
    });
  } finally {
    root?.unmount(); activeClient?.clear(); host.remove(); window.fetch = originalFetch; window.confirm = originalConfirm;
  }
  return { passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length, results };
}
