import test from 'node:test';
import assert from 'node:assert/strict';

import * as validation from './formValidation.ts';
const student = { name: '   ', phone: '', parentContact: '', grade: '', hourlyRateVnd: '', notes: '' };

for (const [field, value] of [
  ['name', 'A'.repeat(121)], ['grade', 'A'.repeat(31)], ['parentContact', 'A'.repeat(121)],
  ['notes', 'A'.repeat(2001)], ['phone', 'not a phone'], ['phone', '123'],
  ['hourlyRateVnd', '1e5'], ['hourlyRateVnd', '0xFF'], ['hourlyRateVnd', '1.5'],
  ['hourlyRateVnd', '-1'], ['hourlyRateVnd', '9007199254740992'],
]) {
  test(`student rejects invalid ${field}: ${value.slice(0, 20)}`, () => {
    assert.ok(validation.validateStudent({ ...student, name: 'An', [field]: value }));
  });
}
test('student accepts Vietnamese names, formatted international phone and zero/free hourly rate', () => {
  assert.equal(validation.validateStudent({ ...student, name: '  Nguyễn Ánh  ', phone: '+84 (90) 123-4567', hourlyRateVnd: ' 0 ' }), null);
});

test('submission gate rejects a synchronous double submit, unlocks after failure and permits retry', async () => {
  assert.equal(typeof validation.createSubmissionGate, 'function');
  const gate = validation.createSubmissionGate();
  let calls = 0;
  let release;
  const first = gate.run(async () => { calls++; await new Promise(resolve => { release = resolve; }); });
  await gate.run(async () => { calls++; });
  assert.equal(calls, 1);
  assert.equal(gate.pending, true);
  release();
  await first;
  assert.equal(gate.pending, false);
  await assert.rejects(gate.run(async () => { throw new Error('offline'); }), /offline/);
  await gate.run(async () => { calls++; });
  assert.equal(calls, 2);
});

test('payment retry uses the same idempotency key for an identical payload, but not edited data', () => {
  assert.equal(typeof validation.createPaymentAttempt, 'function');
  let sequence = 0;
  const attempt = validation.createPaymentAttempt(() => `key-${++sequence}`);
  assert.equal(attempt.keyFor({ amount: 10, date: '2026-01-01' }), 'key-1');
  assert.equal(attempt.keyFor({ amount: 10, date: '2026-01-01' }), 'key-1');
  assert.equal(attempt.keyFor({ amount: 11, date: '2026-01-01' }), 'key-2');
  assert.equal(attempt.keyFor({ amount: 10, date: '2026-01-01' }), 'key-1');
});

for (const value of ['', ' ', '1e2', '0x10', '1.2', '0', '-1', '481', 'Infinity']) {
  test(`lesson duration rejects ${JSON.stringify(value)}`, () => {
    assert.equal(validation.integerInput(value, 1, 480), null);
  });
}
for (const value of ['', '2026-02-30', '2026-13-01', '0000-01-01', '2026-1-01']) {
  test(`payment date rejects impossible or incomplete date ${value}`, () => {
    assert.equal(typeof validation.parseDateInput, 'function');
    assert.equal(validation.parseDateInput(value), null);
  });
}
test('date parser accepts leap day and payment validation rejects future dates and overlong notes', () => {
  assert.equal(validation.parseDateInput('2024-02-29')?.toISOString(), '2024-02-29T00:00:00.000Z');
  assert.ok(validation.validatePayment('10', '2026-01-02', '', '2026-01-01'));
  assert.ok(validation.validatePayment('10', '2026-01-01', 'n'.repeat(501), '2026-01-01'));
  assert.equal(validation.validatePayment(' 10 ', '2026-01-01', ' ', '2026-01-01'), null);
});
test('payment amounts are required positive safe decimal integers', () => {
  for (const amount of ['', '0', '-5', '1e5', '0xff', '9007199254740992']) {
    assert.ok(validation.validatePayment(amount, '2026-01-01', '', '2026-01-01'));
  }
});
test('audit reasons must be nonblank and at most 500 characters', () => {
  assert.equal(typeof validation.validateReason, 'function');
  assert.ok(validation.validateReason('   '));
  assert.ok(validation.validateReason('x'.repeat(501)));
  assert.equal(validation.validateReason('  Ghi thiếu tiền  '), null);
});
test('lesson date-time rejects normalized impossible dates rather than silently moving the booking', () => {
  assert.equal(typeof validation.parseLocalDateTime, 'function');
  for (const value of ['', '2026-02-30T12:00', '2026-01-01T24:00', '2026-01-01']) {
    assert.equal(validation.parseLocalDateTime(value), null);
  }
  assert.ok(validation.parseLocalDateTime('2026-01-01T12:30') instanceof Date);
});
test('editing a lesson retains its student, subject and duration instead of resetting to defaults', () => {
  assert.equal(typeof validation.lessonDefaults, 'function');
  assert.deepEqual(validation.lessonDefaults({ studentId: 's1', subject: 'Anh', scheduledMinutes: 90 }), {
    studentId: 's1', subject: 'Anh', minutes: '90',
  });
});

test('student names containing only whitespace are required', () => {
  assert.equal(typeof validation.validateStudent, 'function', 'student validation must be available to all form submissions');
  assert.equal(validation.validateStudent(student), 'Tên học sinh là bắt buộc.');
});
