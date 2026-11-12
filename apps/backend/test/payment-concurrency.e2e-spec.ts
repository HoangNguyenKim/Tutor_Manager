import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { AppModule, BACKEND_CONFIG } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import type { BackendConfig } from '../src/config';
import { PrismaService } from '../src/db/prisma.service';
import { TuitionRepository } from '../src/tuition/tuition.repository';

const TOKEN = 'payment-concurrency-test-token-0123456789';

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}

describe('Payment atomicity and idempotency (real SQLite)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repo: TuitionRepository;
  let dataDir: string;
  let studentId: string;
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${TOKEN}`);
  const post = (body: object) => auth(request(app.getHttpServer()).post('/api/payments')).send(body);
  const correct = (id: string, amount: number) => auth(request(app.getHttpServer()).patch(`/api/payments/${id}/correct`))
    .send({ newAmountVnd: amount, reason: 'Cash reconciliation' });
  const payload = (key?: string) => ({ studentId, amountVnd: 10000, paidAt: '2026-11-01T00:00:00Z', note: 'Cash', idempotencyKey: key });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-payment-concurrency-'));
    const cfg: BackendConfig = {
      host: '127.0.0.1', port: 3001, localToken: TOKEN, dataDir,
      logLevel: 'error', allowedOrigins: ['http://127.0.0.1:5173'],
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(BACKEND_CONFIG).useValue(cfg).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, cfg);
    await app.init();
    prisma = app.get(PrismaService);
    repo = app.get(TuitionRepository);
    studentId = (await auth(request(app.getHttpServer()).post('/api/students')).send({ name: 'Payment regression (fictional)' })).body.data.id;
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (app) await app.close();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  });

  async function raceAbsentKey(firstBody: object, secondBody: object) {
    const bothRead = gate();
    const lookup = repo.findByIdempotencyKey.bind(repo);
    let reads = 0;
    jest.spyOn(repo, 'findByIdempotencyKey').mockImplementation((async (key: string) => {
      const result = await lookup(key);
      if (++reads <= 2) {
        expect(result).toBeNull();
        if (reads === 2) bothRead.release();
        await bothRead.promise;
      }
      return result;
    }) as typeof repo.findByIdempotencyKey);
    return Promise.all([post(firstBody), post(secondBody)]);
  }

  it('recovers a real unique-key collision between identical absent-key requests', async () => {
    const body = payload('absent-identical');
    const results = await raceAbsentKey(body, body);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(results.map((r) => r.body.data.duplicate).sort()).toEqual([false, true]);
    expect(results[0].body.data.payment.id).toBe(results[1].body.data.payment.id);
    expect(await prisma.payment.count({ where: { idempotencyKey: body.idempotencyKey } })).toBe(1);
  });

  it.each(['amountVnd', 'paidAt', 'note', 'studentId'] as const)(
    'returns 409 for a raced key with a different %s without inserting a second payment',
    async (field) => {
      const body = payload(`absent-mismatch-${field}`);
      let otherStudentId = studentId;
      if (field === 'studentId') {
        const other = await auth(request(app.getHttpServer()).post('/api/students')).send({ name: 'Other payment owner (fictional)' });
        otherStudentId = other.body.data.id as string;
      }
      const values = { amountVnd: 20000, paidAt: '2026-11-02T00:00:00Z', note: 'Transfer', studentId: otherStudentId };
      const results = await raceAbsentKey(body, { ...body, [field]: values[field] });
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      const winner = results.find((r) => r.status === 201)!;
      expect(winner.body.data.duplicate).toBe(false);
      expect(results.find((r) => r.status === 409)!.body.error.code).toBe('CONFLICT');
      const rows = await prisma.payment.findMany({ where: { idempotencyKey: body.idempotencyKey } });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.id).toBe(winner.body.data.payment.id);
    },
  );

  it('matches normalized notes and equivalent paidAt instants after correction', async () => {
    const body = { ...payload('normalized-identity'), note: '  Cash  ' };
    const first = await post(body);
    const id = first.body.data.payment.id as string;
    expect((await correct(id, 20000)).status).toBe(200);
    const retry = await post({ ...body, note: 'Cash', paidAt: '2026-11-01T07:00:00+07:00' });
    expect(retry.status).toBe(201);
    expect(retry.body.data).toMatchObject({ duplicate: true, payment: { id, amountVnd: 20000, note: 'Cash' } });
    expect((await post({ ...body, paidAt: '2026-11-02T00:00:00Z' })).status).toBe(409);
    expect((await post({ ...body, note: 'Transfer' })).status).toBe(409);
  });

  it('treats absent and blank notes equivalently without collapsing nonempty keys', async () => {
    const body = { ...payload('key-without-note'), note: undefined };
    const first = await post(body);
    const retry = await post({ ...body, note: '   ' });
    expect(retry.status).toBe(201);
    expect(retry.body.data.duplicate).toBe(true);
    expect(retry.body.data.payment.id).toBe(first.body.data.payment.id);
    const distinct = await post({ ...body, idempotencyKey: ' key-without-note ' });
    expect(distinct.status).toBe(201);
    expect(distinct.body.data.duplicate).toBe(false);
    expect(distinct.body.data.payment.id).not.toBe(first.body.data.payment.id);
  });

  it('keeps the original keyed create identity after multiple amount corrections', async () => {
    const body = payload('corrected-original');
    const first = await post(body);
    const id = first.body.data.payment.id as string;
    expect((await correct(id, 20000)).status).toBe(200);
    expect((await correct(id, 30000)).status).toBe(200);
    const retry = await post(body);
    expect(retry.status).toBe(201);
    expect(retry.body.data).toMatchObject({ duplicate: true, payment: { id, amountVnd: 30000 } });
    expect((await post({ ...body, amountVnd: 30000 })).status).toBe(409);
    expect(await prisma.payment.count({ where: { idempotencyKey: body.idempotencyKey } })).toBe(1);
  });

  it('serializes overlapping corrections into a truthful audit chain or returns a conflict', async () => {
    const created = await post(payload());
    const id = created.body.data.payment.id as string;
    const firstAuditWritten = gate();
    const finishFirst = gate();
    const secondStarted = gate();
    const createCorrection = repo.createCorrection.bind(repo);
    let audits = 0;
    jest.spyOn(repo, 'createCorrection').mockImplementation((async (...args: Parameters<typeof repo.createCorrection>) => {
      const result = await createCorrection(...args);
      if (++audits === 1) {
        firstAuditWritten.release();
        await finishFirst.promise;
      }
      return result;
    }) as typeof repo.createCorrection);
    // Observe entry, not timing: old code enters its second read; atomic code
    // enters its second transaction. All reads and writes still hit SQLite.
    const transaction = repo.transaction.bind(repo);
    let transactions = 0;
    jest.spyOn(repo, 'transaction').mockImplementation((work) => {
      if (++transactions === 2) secondStarted.release();
      return transaction(work);
    });
    const findPayment = repo.findPayment.bind(repo);
    let reads = 0;
    jest.spyOn(repo, 'findPayment').mockImplementation((async (...args: Parameters<typeof repo.findPayment>) => {
      const result = await findPayment(...args);
      if (++reads === 2) secondStarted.release();
      return result;
    }) as typeof repo.findPayment);
    const first = correct(id, 20000).then((r) => r);
    await firstAuditWritten.promise;
    const second = correct(id, 30000).then((r) => r);
    await secondStarted.promise;
    finishFirst.release();
    const results = await Promise.all([first, second]);
    expect(results[0].status).toBe(200);
    expect([200, 409]).toContain(results[1].status);
    const stored = await prisma.payment.findUniqueOrThrow({ where: { id }, include: { corrections: true } });
    expect(stored.corrections).toHaveLength(results[1].status === 200 ? 2 : 1);
    expect(stored.corrections.find((c) => c.newAmountVnd === 20000)?.previousAmountVnd).toBe(10000);
    if (results[1].status === 200) {
      expect(stored.corrections.find((c) => c.newAmountVnd === 30000)?.previousAmountVnd).toBe(20000);
      expect(stored.amountVnd).toBe(30000);
    } else {
      expect(stored.amountVnd).toBe(20000);
    }
  });

  it('rolls back the audit when the actual SQLite payment update fails', async () => {
    const created = await post(payload());
    expect(created.status).toBe(201);
    const id = created.body.data.payment.id as string;
    await prisma.$executeRawUnsafe(`CREATE TRIGGER reject_payment_update BEFORE UPDATE OF amountVnd ON Payment BEGIN SELECT RAISE(ABORT, 'injected update failure'); END`);
    try {
      const result = await correct(id, 20000);
      expect(result.status).toBe(500);
      const stored = await prisma.payment.findUniqueOrThrow({ where: { id }, include: { corrections: true } });
      expect(stored.amountVnd).toBe(10000);
      expect(stored.corrections).toHaveLength(0);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER reject_payment_update');
    }
  });
});
