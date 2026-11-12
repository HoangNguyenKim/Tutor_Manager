import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { AppModule, BACKEND_CONFIG } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import type { BackendConfig } from '../src/config';

const TEST_TOKEN = 'rate-report-regression-test-token';

describe('Rate snapshots and report validation (real SQLite API)', () => {
  let app: INestApplication;
  let dataDir: string;
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${TEST_TOKEN}`);
  const student = async (hourlyRateVnd = 240000) => {
    const res = await auth(request(app.getHttpServer()).post('/api/students'))
      .send({ name: 'Rate regression (fictional)', hourlyRateVnd });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };

  beforeAll(async () => {
    const scratch = process.env.TMPDIR ?? 'C:/Users/OS/AppData/Local/hermes/cache/scratch';
    dataDir = fs.mkdtempSync(path.join(scratch, 'tm-rate-report-'));
    const cfg: BackendConfig = {
      host: '127.0.0.1', port: 3001, localToken: TEST_TOKEN, dataDir,
      logLevel: 'error', allowedOrigins: ['http://127.0.0.1:5173'],
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(BACKEND_CONFIG).useValue(cfg).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, cfg);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe.each(['overview', 'bonus', 'payments', 'students/test-student/history'])('%s date validation', (endpoint) => {
    it.each([
      ['malformed date', { from: 'not-a-date', to: '2026-12-31' }],
      ['impossible date', { from: '2026-02-30', to: '2026-12-31' }],
      ['impossible timestamp', { from: '2026-02-30T10:00:00Z', to: '2026-12-31' }],
      ['invalid month', { from: '2026-13-01', to: '2026-12-31' }],
      ['non-ISO date', { from: '12/01/2026', to: '2026-12-31' }],
      ['from only', { from: '2026-12-01' }],
      ['to only', { to: '2026-12-31' }],
      ['empty dates', { from: '', to: '' }],
      ['reversed range', { from: '2026-12-31', to: '2026-12-01' }],
      ['unsupported low year', { from: '1899-01-01', to: '2026-12-31' }],
      ['unsupported high year', { from: '2026-12-01', to: '+010000-01-01' }],
      ['repeated date', { from: ['2026-12-01', '2026-12-02'], to: '2026-12-31' }],
    ])('rejects %s with HTTP 400', async (_label, query) => {
      const res = await auth(request(app.getHttpServer()).get(`/api/reports/${endpoint}`).query(query));
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    });
  });

  it('validates supplied dates even when overview has a preset', async () => {
    const res = await auth(request(app.getHttpServer()).get('/api/reports/overview')
      .query({ preset: 'month', from: 'not-a-date', to: '2026-12-31' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  it.each([
    ['empty year', { year: '', month: '1' }],
    ['two-digit year', { year: '99', month: '1' }],
    ['low year', { year: '1899', month: '1' }],
    ['high year', { year: '10000', month: '1' }],
    ['huge year', { year: '999999999', month: '1' }],
    ['fractional year', { year: '2026.5', month: '1' }],
    ['exponential year', { year: '2.026e3', month: '1' }],
    ['missing year', { month: '1' }],
    ['missing month', { year: '2026' }],
    ['empty month', { year: '2026', month: '' }],
    ['zero month', { year: '2026', month: '0' }],
    ['high month', { year: '2026', month: '13' }],
    ['fractional month', { year: '2026', month: '1.5' }],
    ['repeated year', { year: ['2026', '2027'], month: '1' }],
  ])('rejects monthly %s with HTTP 400', async (_label, query) => {
    const res = await auth(request(app.getHttpServer()).get('/api/reports/monthly').query(query));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  });

  it.each([0, 180000])('preserves explicit lesson and recurrence rate %i instead of inheriting', async (hourlyRateVnd) => {
    const studentId = await student();
    const server = app.getHttpServer();
    const lesson = await auth(request(server).post('/api/lessons')).send({
      studentId, scheduledStart: '2026-11-01T10:00:00Z', scheduledMinutes: 60, subject: 'Toán', hourlyRateVnd,
    }).expect(201);
    expect(lesson.body.data.hourlyRateVnd).toBe(hourlyRateVnd);
    const recurrence = await auth(request(server).post('/api/lessons/recurrence')).send({
      studentId, weekday: 3, startTime: '17:00', scheduledMinutes: 60, subject: 'Toán', hourlyRateVnd,
      validFrom: '2026-12-01', validUntil: '2026-12-10',
    }).expect(201);
    expect(recurrence.body.data.rule.hourlyRateVnd).toBe(hourlyRateVnd);
    await auth(request(server).patch(`/api/students/${studentId}`)).send({ hourlyRateVnd: 360000 }).expect(200);
    const persisted = await auth(request(server).get('/api/lessons').query({ studentId })).expect(200);
    expect(persisted.body.data.items).toHaveLength(3);
    for (const row of persisted.body.data.items) {
      expect(row.hourlyRateVnd).toBe(hourlyRateVnd);
      const completed = await auth(request(server).post(`/api/lessons/${row.id}/complete`))
        .send({ actualMinutes: 60 }).expect(200);
      expect(completed.body.data.tuitionVnd).toBe(hourlyRateVnd);
    }
  });

  it('keeps zero as the default for a student with no configured rate', async () => {
    const studentId = await student(0);
    const server = app.getHttpServer();
    const lesson = await auth(request(server).post('/api/lessons')).send({
      studentId, scheduledStart: '2026-12-01T10:00:00Z', scheduledMinutes: 60, subject: 'Toán',
    }).expect(201);
    expect(lesson.body.data.hourlyRateVnd).toBe(0);
    const recurrence = await auth(request(server).post('/api/lessons/recurrence')).send({
      studentId, weekday: 3, startTime: '17:00', scheduledMinutes: 60, subject: 'Toán',
      validFrom: '2026-12-01', validUntil: '2026-12-10',
    }).expect(201);
    expect(recurrence.body.data.rule.hourlyRateVnd).toBe(0);
    const persisted = await auth(request(server).get('/api/lessons').query({ studentId })).expect(200);
    expect(persisted.body.data.items).toHaveLength(3);
    expect(persisted.body.data.items.every((row: { hourlyRateVnd: number }) => row.hourlyRateVnd === 0)).toBe(true);
  });

  it.each(['overview', 'bonus', 'payments', 'students/test-student/history'])('preserves valid %s date pairs and omitted filters', async (endpoint) => {
    const get = () => auth(request(app.getHttpServer()).get(`/api/reports/${endpoint}`));
    for (const query of [
      {},
      { from: '2024-02-29', to: '2024-02-29' },
      { from: '1900-01-01', to: '9999-12-31' },
      { from: '2026-12-01T10:00:00+07:00', to: '2026-12-01T03:00:00Z' },
    ]) {
      const res = await get().query(query).expect(200);
      expect(res.body.ok).toBe(true);
    }
  });

  it.each([[1900, 1], [9999, 12], [2024, 2], [2026, 12]])('preserves supported monthly year %i month %i', async (year, month) => {
    const res = await auth(request(app.getHttpServer()).get('/api/reports/monthly').query({ year, month })).expect(200);
    expect(res.body.data).toMatchObject({ year, month });
  });

  it.each(['week', 'month'])('preserves the overview %s preset', async (preset) => {
    const res = await auth(request(app.getHttpServer()).get('/api/reports/overview').query({ preset })).expect(200);
    expect(res.body.ok).toBe(true);
    expect(Number.isFinite(new Date(res.body.data.range.from).getTime())).toBe(true);
    expect(Number.isFinite(new Date(res.body.data.range.to).getTime())).toBe(true);
  });

  it('snapshots the student rate on the recurrence rule and every generated lesson', async () => {
    const studentId = await student();
    const server = app.getHttpServer();
    const recurrence = await auth(request(server).post('/api/lessons/recurrence')).send({
      studentId, weekday: 3, startTime: '17:00', scheduledMinutes: 60, subject: 'Toán',
      timeZone: 'Asia/Ho_Chi_Minh', validFrom: '2026-12-01', validUntil: '2026-12-10',
    }).expect(201);
    expect(recurrence.body.data.rule.hourlyRateVnd).toBe(240000);
    expect(recurrence.body.data.created).toBe(2);
    await auth(request(server).patch(`/api/students/${studentId}`)).send({ hourlyRateVnd: 360000 }).expect(200);
    const lessons = await auth(request(server).get('/api/lessons').query({ studentId })).expect(200);
    expect(lessons.body.data.items).toHaveLength(2);
    for (const lesson of lessons.body.data.items) {
      expect(lesson.hourlyRateVnd).toBe(240000);
      const completed = await auth(request(server).post(`/api/lessons/${lesson.id}/complete`))
        .send({ actualMinutes: 60 }).expect(200);
      expect(completed.body.data.tuitionVnd).toBe(240000);
    }
  });

  it('snapshots the student rate when an individual lesson omits its rate', async () => {
    const studentId = await student();
    const server = app.getHttpServer();
    const lesson = await auth(request(server).post('/api/lessons')).send({
      studentId, scheduledStart: '2026-12-01T10:00:00Z', scheduledMinutes: 60, subject: 'Toán',
    });
    expect(lesson.status).toBe(201);
    expect(lesson.body.data.hourlyRateVnd).toBe(240000);
    await auth(request(server).patch(`/api/students/${studentId}`)).send({ hourlyRateVnd: 360000 }).expect(200);
    const persisted = await auth(request(server).get(`/api/lessons/${lesson.body.data.id}`)).expect(200);
    expect(persisted.body.data.hourlyRateVnd).toBe(240000);
    const completed = await auth(request(server).post(`/api/lessons/${lesson.body.data.id}/complete`))
      .send({ actualMinutes: 60 }).expect(200);
    expect(completed.body.data.tuitionVnd).toBe(240000);
  });
});
