import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { AppModule, BACKEND_CONFIG } from '../src/app.module';
import { PrismaService } from '../src/db/prisma.service';
import { configureApp } from '../src/app.setup';
import type { BackendConfig } from '../src/config';

const TEST_TOKEN = 'test-integrity-token-0123456789abcdef';

describe('Workflow integrity (real API and isolated SQLite)', () => {
  let app: INestApplication;
  let dataDir: string;
  let studentId: string;
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${TEST_TOKEN}`);

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-integrity-'));
    const cfg: BackendConfig = {
      host: '127.0.0.1', port: 3001, localToken: TEST_TOKEN, dataDir,
      logLevel: 'error', allowedOrigins: ['http://127.0.0.1:5173'],
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(BACKEND_CONFIG).useValue(cfg).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, cfg);
    await app.init();
    const created = await auth(request(app.getHttpServer()).post('/api/students'))
      .send({ name: 'Integrity test student' }).expect(201);
    studentId = created.body.data.id as string;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('rejects whitespace-only student names without creating a row', async () => {
    const server = app.getHttpServer();
    const before = await auth(request(server).get('/api/students?status=all'));
    const response = await auth(request(server).post('/api/students')).send({ name: ' \t\n ' });
    expect(response.status).toBe(400);
    const after = await auth(request(server).get('/api/students?status=all'));
    expect(after.body.data.total).toBe(before.body.data.total);
  });

  it('clears optional profile fields when edited to empty strings', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/students')).send({
      name: 'Profile clearing test', phone: '12345', parentContact: 'Parent', grade: '10', notes: 'Old note',
    }).expect(201);
    const response = await auth(request(server).patch(`/api/students/${created.body.data.id}`))
      .send({ phone: '', parentContact: '   ', grade: '', notes: '' }).expect(200);
    expect(response.body.data).toMatchObject({ phone: null, parentContact: null, grade: null, notes: null });
    const persisted = await auth(request(server).get(`/api/students/${created.body.data.id}`)).expect(200);
    expect(persisted.body.data.student).toMatchObject({ phone: null, parentContact: null, grade: null, notes: null });
  });

  it('rejects reuse of a payment key for a different payment without leaking or changing it', async () => {
    const server = app.getHttpServer();
    const payload = { studentId, amountVnd: 120000, paidAt: '2026-11-01T10:00:00Z', idempotencyKey: 'integrity-payment-key' };
    const created = await auth(request(server).post('/api/payments')).send(payload).expect(201);
    const conflict = await auth(request(server).post('/api/payments')).send({ ...payload, amountVnd: 240000 });
    expect(conflict.status).toBe(409);
    const retry = await auth(request(server).post('/api/payments')).send(payload).expect(201);
    expect(retry.body.data.duplicate).toBe(true);
    expect(retry.body.data.payment.id).toBe(created.body.data.payment.id);
    const payments = await auth(request(server).get(`/api/students/${studentId}/payments`)).expect(200);
    expect(payments.body.data).toHaveLength(1);
    expect(payments.body.data[0].amountVnd).toBe(120000);
  });

  it.each([
    ['/api/lessons', { scheduledStart: '2026-02-30T10:00:00Z', scheduledMinutes: 60, subject: 'Toán' }],
    ['/api/payments', { paidAt: '2026-02-30T10:00:00Z', amountVnd: 10000 }],
    ['/api/lessons/recurrence', { validFrom: '2026-02-30T00:00:00Z', weekday: 1, startTime: '10:00', scheduledMinutes: 60, subject: 'Toán' }],
  ])('rejects impossible calendar dates at %s', async (endpoint, body) => {
    const response = await auth(request(app.getHttpServer()).post(endpoint as string)).send({ ...body as object, studentId });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION');
  });

  it.each([
    { startTime: '24:00' }, { startTime: '12:60' },
    { timeZone: 'Not/AZone' },
    { validUntil: '2026-10-01T00:00:00Z' },
  ])('rejects invalid recurrence metadata %j before persisting a rule', async (invalid) => {
    const db = app.get(PrismaService);
    const before = await db.recurrenceRule.count();
    const response = await auth(request(app.getHttpServer()).post('/api/lessons/recurrence')).send({
      studentId, weekday: 1, startTime: '10:00', scheduledMinutes: 60, subject: 'Toán',
      validFrom: '2026-11-01T00:00:00Z', validUntil: '2026-11-30T00:00:00Z', ...invalid,
    });
    expect(response.status).toBe(400);
    expect(await db.recurrenceRule.count()).toBe(before);
  });

  it.each(['', ' \t ', null])('rejects invalid edited student name %j with 400 and preserves the name', async (name) => {
    const response = await auth(request(app.getHttpServer()).patch(`/api/students/${studentId}`)).send({ name });
    expect(response.status).toBe(400);
    const persisted = await app.get(PrismaService).student.findUniqueOrThrow({ where: { id: studentId } });
    expect(persisted.name).toBe('Integrity test student');
  });

  it('rejects an invalid lesson timezone edit without changing the stored zone', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/lessons')).send({
      studentId, scheduledStart: '2026-12-01T10:00:00Z', scheduledMinutes: 60, subject: 'Toán',
    }).expect(201);
    const id = created.body.data.id as string;
    const response = await auth(request(server).patch(`/api/lessons/${id}`)).send({ timeZone: 'Not/AZone' });
    expect(response.status).toBe(400);
    const persisted = await app.get(PrismaService).lesson.findUniqueOrThrow({ where: { id } });
    expect(persisted.timeZone).toBe('Asia/Ho_Chi_Minh');
  });

  it('requires a nonblank audit reason for payment corrections and adjustments', async () => {
    const server = app.getHttpServer();
    const payment = await auth(request(server).post('/api/payments')).send({
      studentId, amountVnd: 10000, paidAt: '2026-11-05T10:00:00Z',
    }).expect(201);
    const id = payment.body.data.payment.id as string;
    const correction = await auth(request(server).patch(`/api/payments/${id}/correct`))
      .send({ newAmountVnd: 20000, reason: ' \t ' });
    const adjustment = await auth(request(server).post('/api/adjustments'))
      .send({ studentId, amountVnd: 10000, reason: ' \n ' });
    expect([correction.status, adjustment.status]).toEqual([400, 400]);
    const persisted = await app.get(PrismaService).payment.findUniqueOrThrow({ where: { id }, include: { corrections: true } });
    expect(persisted.amountVnd).toBe(10000);
    expect(persisted.corrections).toHaveLength(0);
  });

  it.each([
    ['/api/students', { name: 'Oversized rate', hourlyRateVnd: 9007199254740992 }],
    ['/api/lessons', { scheduledStart: '2027-01-01T10:00:00Z', scheduledMinutes: 60, subject: 'Toán', hourlyRateVnd: 9007199254740992 }],
    ['/api/payments', { paidAt: '2026-11-10T10:00:00Z', amountVnd: 9007199254740992 }],
    ['/api/adjustments', { amountVnd: -9007199254740992, reason: 'Out of range' }],
  ])('rejects unsafe monetary integers at %s', async (endpoint, payload) => {
    const body = endpoint === '/api/students' ? payload : { ...payload, studentId };
    const response = await auth(request(app.getHttpServer()).post(endpoint as string)).send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION');
  });

  it('includes adjustment-only students in monthly report rows so they reconcile with totals', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/students')).send({ name: 'Adjustment-only student' }).expect(201);
    const id = created.body.data.id as string;
    const adjustment = await auth(request(server).post('/api/adjustments'))
      .send({ studentId: id, amountVnd: 12345, reason: 'Additional tuition' }).expect(201);
    const date = new Date(adjustment.body.data.createdAt as string);
    const report = await auth(request(server).get(`/api/reports/monthly?year=${date.getFullYear()}&month=${date.getMonth() + 1}`)).expect(200);
    expect(report.body.data.students).toEqual(expect.arrayContaining([
      expect.objectContaining({ studentId: id, tuitionVnd: 12345, lessons: 0, paidVnd: 0 }),
    ]));
    const rows = report.body.data.students as { tuitionVnd: number }[];
    expect(rows.reduce((sum, row) => sum + row.tuitionVnd, 0)).toBe(report.body.data.totals.tuitionVnd);
  });
});
