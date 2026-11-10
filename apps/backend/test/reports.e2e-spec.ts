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

describe('Reports API (e2e)', () => {
  let app: INestApplication;
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${TEST_TOKEN}`);
  let studentId: string;

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-reports-'));
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
    const created = await auth(request(app.getHttpServer()).post('/api/students')).send({ name: 'Report Owner (fictional)' });
    studentId = created.body.data.id as string;
    const server = app.getHttpServer();
    const mk = (start: string, planned: number, subject: string) =>
      auth(request(server).post('/api/lessons')).send({ studentId, scheduledStart: start, scheduledMinutes: planned, subject, hourlyRateVnd: 200000 });
    const l1 = await mk('2026-12-01T10:00:00Z', 90, 'Toán');
    await auth(request(server).post(`/api/lessons/${l1.body.data.id}/complete`)).send({ actualMinutes: 120, bonusBillable: true });
    const l2 = await mk('2026-12-02T10:00:00Z', 60, 'Lý');
    await auth(request(server).post(`/api/lessons/${l2.body.data.id}/complete`)).send({ actualMinutes: 60 });
    await auth(request(server).post('/api/payments')).send({ studentId, amountVnd: 200000, paidAt: '2026-12-03T00:00:00Z' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('overview matches database records', async () => {
    const res = await auth(
      request(app.getHttpServer()).get('/api/reports/overview?from=2026-12-01T00:00:00Z&to=2026-12-31T23:59:59Z'),
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      activeStudents: 1,
      completedLessons: 2,
      plannedMinutes: 150,
      actualMinutes: 180,
      bonusMinutes: 30,
      billableMinutes: 210,
      tuitionVnd: 700000,
      collectedVnd: 200000,
      outstandingVnd: 500000,
    });
  });

  it('monthly summary respects filters', async () => {
    const res = await auth(request(app.getHttpServer()).get('/api/reports/monthly?year=2026&month=12'));
    expect(res.body.data.totals).toMatchObject({ lessons: 2, tuitionVnd: 700000, collectedVnd: 200000 });
    expect(res.body.data.students[0].studentName).toBe('Report Owner (fictional)');
    const empty = await auth(request(app.getHttpServer()).get('/api/reports/monthly?year=2025&month=1'));
    expect(empty.body.data.totals).toMatchObject({ lessons: 0, tuitionVnd: 0, collectedVnd: 0 });
    expect(empty.body.data.students).toEqual([]);
  });

  it('bonus summary and payment history filter by range', async () => {
    const server = app.getHttpServer();
    const bonus = await auth(request(server).get('/api/reports/bonus?from=2026-12-01T00:00:00Z&to=2026-12-31T23:59:59Z'));
    expect(bonus.body.data.students[0]).toMatchObject({ bonusMinutes: 30, billableBonusMinutes: 30 });
    const payments = await auth(request(server).get('/api/reports/payments?from=2026-12-01T00:00:00Z&to=2026-12-31T23:59:59Z'));
    expect(payments.body.data.totalVnd).toBe(200000);
    const none = await auth(request(server).get('/api/reports/payments?from=2025-01-01T00:00:00Z&to=2025-01-31T23:59:59Z'));
    expect(none.body.data).toMatchObject({ totalVnd: 0, payments: [] });
  });

  it('per-student history returns lessons, payments, adjustments', async () => {
    const res = await auth(request(app.getHttpServer()).get(`/api/reports/students/${studentId}/history`));
    expect(res.body.data.lessons).toHaveLength(2);
    expect(res.body.data.payments).toHaveLength(1);
  });
});
