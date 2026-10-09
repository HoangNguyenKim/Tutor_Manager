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

describe('Lessons API (e2e)', () => {
  let app: INestApplication;
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${TEST_TOKEN}`);
  let studentId: string;

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-lessons-'));
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
    const created = await auth(request(app.getHttpServer()).post('/api/students')).send({ name: 'Lesson Owner (fictional)' });
    studentId = created.body.data.id as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates and lists lessons with student info', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-10-13T10:00:00Z',
      scheduledMinutes: 60,
      subject: 'Toán',
      hourlyRateVnd: 200000,
    });
    expect(created.status).toBe(201);
    const listed = await auth(request(server).get('/api/lessons?from=2026-10-13T00:00:00Z&to=2026-10-14T00:00:00Z'));
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].student.name).toBe('Lesson Owner (fictional)');
  });

  it('rejects overlapping lessons (409 with conflicting ids)', async () => {
    const server = app.getHttpServer();
    const res = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-10-13T10:30:00Z',
      scheduledMinutes: 60,
      subject: 'Toán',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.details.conflictingIds).toHaveLength(1);
  });

  it('allows touching edges and reschedules with confirmation semantics', async () => {
    const server = app.getHttpServer();
    const edge = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-10-13T11:00:00Z',
      scheduledMinutes: 60,
      subject: 'Toán',
    });
    expect(edge.status).toBe(201);
    const clash = await auth(request(server).patch(`/api/lessons/${edge.body.data.id}`)).send({
      scheduledStart: '2026-10-13T10:30:00Z',
    });
    expect(clash.status).toBe(409);
  });

  it('cancel keeps history; completed cannot be cancelled', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-10-14T10:00:00Z',
      scheduledMinutes: 60,
      subject: 'Toán',
    });
    const id = created.body.data.id as string;
    const cancelled = await auth(request(server).post(`/api/lessons/${id}/cancel`));
    expect(cancelled.body.data.status).toBe('cancelled');
    const again = await auth(request(server).post(`/api/lessons/${id}/cancel`));
    expect(again.body.data.status).toBe('cancelled');
    const history = await auth(request(server).get('/api/lessons?status=cancelled'));
    expect(history.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('generates weekly recurrence locally', async () => {
    const server = app.getHttpServer();
    const res = await auth(request(server).post('/api/lessons/recurrence')).send({
      studentId,
      weekday: 3,
      startTime: '17:00',
      scheduledMinutes: 90,
      subject: 'Toán',
      timeZone: 'Asia/Ho_Chi_Minh',
      validFrom: '2026-10-12T00:00:00Z',
      validUntil: '2026-10-29T00:00:00Z',
    });
    expect(res.status).toBe(201);
    // Wednesdays 17:00 ICT = 10:00Z: Oct 14, 21, 28.
    expect(res.body.data.created).toBe(3);
    expect(res.body.data.skipped).toEqual([]);
  });

  it('returns 400 for invalid payloads', async () => {
    const res = await auth(request(app.getHttpServer()).post('/api/lessons')).send({
      studentId,
      scheduledStart: 'not-a-date',
      scheduledMinutes: 0,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  it('90 planned / 120 actual = 30 bonus; billable bonus charges correctly', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-11-10T10:00:00Z',
      scheduledMinutes: 90,
      subject: 'Toán',
      hourlyRateVnd: 200000,
    });
    const id = created.body.data.id as string;
    const done = await auth(request(server).post(`/api/lessons/${id}/complete`)).send({
      actualMinutes: 120,
      bonusBillable: true,
    });
    expect(done.status).toBe(200);
    expect(done.body.data).toMatchObject({
      status: 'completed',
      actualMinutes: 120,
      bonusMinutes: 30,
      billableMinutes: 150,
      tuitionVnd: 500000,
    });
  });

  it('90 planned / 60 actual = 0 bonus (early finish)', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-11-11T10:00:00Z',
      scheduledMinutes: 90,
      subject: 'Toán',
      hourlyRateVnd: 200000,
    });
    const done = await auth(request(server).post(`/api/lessons/${created.body.data.id}/complete`)).send({
      actualMinutes: 60,
    });
    expect(done.body.data).toMatchObject({ bonusMinutes: 0, billableMinutes: 60, tuitionVnd: 200000 });
  });

  it('free bonus adds no bonus charge', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-11-12T10:00:00Z',
      scheduledMinutes: 90,
      subject: 'Toán',
      hourlyRateVnd: 200000,
    });
    const done = await auth(request(server).post(`/api/lessons/${created.body.data.id}/complete`)).send({
      actualMinutes: 120,
      bonusBillable: false,
    });
    expect(done.body.data).toMatchObject({ bonusMinutes: 30, billableMinutes: 120, tuitionVnd: 400000 });
  });

  it('re-completing is a 409 that preserves the record', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-11-13T10:00:00Z',
      scheduledMinutes: 60,
      subject: 'Toán',
    });
    const id = created.body.data.id as string;
    await auth(request(server).post(`/api/lessons/${id}/complete`)).send({ actualMinutes: 60 });
    const again = await auth(request(server).post(`/api/lessons/${id}/complete`)).send({ actualMinutes: 60 });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('CONFLICT');
  });

  it('correcting a completed lesson recalculates safely against the snapshot', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-11-14T10:00:00Z',
      scheduledMinutes: 90,
      subject: 'Toán',
      hourlyRateVnd: 200000,
    });
    const id = created.body.data.id as string;
    await auth(request(server).post(`/api/lessons/${id}/complete`)).send({ actualMinutes: 90 });
    const corrected = await auth(request(server).patch(`/api/lessons/${id}/correct`)).send({
      actualMinutes: 120,
      bonusBillable: true,
    });
    expect(corrected.body.data).toMatchObject({ bonusMinutes: 30, billableMinutes: 150, tuitionVnd: 500000 });
  });

  it('rejects invalid or negative durations', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId,
      scheduledStart: '2026-11-15T10:00:00Z',
      scheduledMinutes: 60,
      subject: 'Toán',
    });
    for (const body of [{ actualMinutes: 0 }, { actualMinutes: -30 }, { actualMinutes: 1.5 }, {}]) {
      const res = await auth(request(server).post(`/api/lessons/${created.body.data.id}/complete`)).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION');
    }
  });
});


