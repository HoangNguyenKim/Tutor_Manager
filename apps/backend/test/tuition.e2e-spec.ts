import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { AppModule, BACKEND_CONFIG } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import type { BackendConfig } from '../src/config';

const TEST_TOKEN = 'test-local-token-0123456789abcdef';

describe('Tuition API (e2e)', () => {
  let app: INestApplication;
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${TEST_TOKEN}`);
  let studentId: string;

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-tuition-'));
    const cfg: BackendConfig = {
      host: '127.0.0.1',
      port: 3001,
      localToken: TEST_TOKEN,
      dataDir,
      logLevel: 'error',
      allowedOrigins: ['http://127.0.0.1:5173'],
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(BACKEND_CONFIG)
      .useValue(cfg)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app, cfg);
    await app.init();
    const created = await auth(request(app.getHttpServer()).post('/api/students')).send({ name: 'Tuition Owner (fictional)' });
    studentId = created.body.data.id as string;
  });

  afterAll(async () => {
    await app.close();
  });

  async function completeLesson(start: string, planned: number, actual: number, bonusBillable: boolean, rate = 200000) {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: start,
      scheduledMinutes: planned,
      subject: 'Toán',
      hourlyRateVnd: rate,
    });
    const done = await auth(request(server).post(`/api/lessons/${created.body.data.id}/complete`)).send({
      actualMinutes: actual,
      bonusBillable,
    });
    return done.body.data;
  }

  it('partial payments and balances calculate correctly', async () => {
    const server = app.getHttpServer();
    await completeLesson('2026-12-01T10:00:00Z', 90, 90, false);
    await auth(request(server).post('/api/payments')).send({
      studentId,
      amountVnd: 100000,
      paidAt: '2026-12-02T00:00:00Z',
    });
    const s = await auth(request(server).get(`/api/students/${studentId}/statement?year=2026&month=12`));
    expect(s.body.data).toMatchObject({
      lessonTotalVnd: 300000,
      paidTotalVnd: 100000,
      balanceVnd: 200000,
    });
  });

  it('bonus billing rules are respected; cancelled lessons excluded', async () => {
    const server = app.getHttpServer();
    await completeLesson('2026-12-05T10:00:00Z', 90, 120, true);
    const cancelled = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-12-06T10:00:00Z',
      scheduledMinutes: 90,
      subject: 'Lý',
      hourlyRateVnd: 200000,
    });
    await auth(request(server).post(`/api/lessons/${cancelled.body.data.id}/cancel`));
    const s = await auth(request(server).get(`/api/students/${studentId}/statement?year=2026&month=12`));
    // 300000 (first) + 500000 (billable bonus) = 800000; cancelled adds nothing.
    expect(s.body.data.lessonTotalVnd).toBe(800000);
    expect(s.body.data.lessons).toHaveLength(2);
  });

  it('rate changes do not alter historical completed lessons', async () => {
    const server = app.getHttpServer();
    await auth(request(server).patch(`/api/students/${studentId}`)).send({ hourlyRateVnd: 999999 });
    const s = await auth(request(server).get(`/api/students/${studentId}/statement?year=2026&month=12`));
    expect(s.body.data.lessonTotalVnd).toBe(800000);
  });

  it('editing old lessons recalculates statements consistently', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-12-10T10:00:00Z',
      scheduledMinutes: 90,
      subject: 'Văn',
      hourlyRateVnd: 200000,
    });
    const id = created.body.data.id as string;
    await auth(request(server).post(`/api/lessons/${id}/complete`)).send({ actualMinutes: 90 });
    await auth(request(server).patch(`/api/lessons/${id}/correct`)).send({ actualMinutes: 120, bonusBillable: true });
    const s = await auth(request(server).get(`/api/students/${studentId}/statement?year=2026&month=12`));
    // 800000 + 500000 (corrected) = 1300000.
    expect(s.body.data.lessonTotalVnd).toBe(1300000);
  });

  it('adjustments with reasons affect the amount due', async () => {
    const server = app.getHttpServer();
    await auth(request(server).post('/api/adjustments')).send({
      studentId,
      amountVnd: -50000,
      reason: 'Sibling discount',
    });
    const s = await auth(request(server).get(`/api/students/${studentId}/statement?year=2026&month=12`));
    expect(s.body.data.adjustmentTotalVnd).toBe(-50000);
    expect(s.body.data.amountDueVnd).toBe(1250000);
  });

  it('no duplicate payment on repeated idempotency keys', async () => {
    const server = app.getHttpServer();
    const body = {
      studentId,
      amountVnd: 50000,
      paidAt: '2026-12-15T00:00:00Z',
      idempotencyKey: 'pay-key-1',
    };
    const first = await auth(request(server).post('/api/payments')).send(body);
    expect(first.body.data.duplicate).toBe(false);
    const second = await auth(request(server).post('/api/payments')).send(body);
    expect(second.body.data.duplicate).toBe(true);
    expect(second.body.data.payment.id).toBe(first.body.data.payment.id);
    const list = await auth(request(server).get(`/api/students/${studentId}/payments`));
    expect((list.body.data as unknown[]).filter((p) => (p as { idempotencyKey?: string }).idempotencyKey === 'pay-key-1')).toHaveLength(1);
  });

  it('payment corrections keep an audit trail', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/payments')).send({
      studentId,
      amountVnd: 50000,
      paidAt: '2026-12-16T00:00:00Z',
    });
    const id = created.body.data.payment.id as string;
    const corrected = await auth(request(server).patch(`/api/payments/${id}/correct`)).send({
      newAmountVnd: 80000,
      reason: 'Under-recorded cash',
    });
    expect(corrected.body.data.payment.amountVnd).toBe(80000);
    expect(corrected.body.data.correction).toMatchObject({
      previousAmountVnd: 50000,
      newAmountVnd: 80000,
      reason: 'Under-recorded cash',
    });
    const list = await auth(request(server).get(`/api/students/${studentId}/payments`));
    const found = (list.body.data as { id: string; corrections: unknown[] }[]).find((p) => p.id === id);
    expect(found?.corrections).toHaveLength(1);
  });
});
