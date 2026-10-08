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

const TEST_TOKEN = 'test-local-token-0123456789abcdef';

describe('Students API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${TEST_TOKEN}`);

  beforeAll(async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-students-'));
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
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('CRUD: create, get, update, list, search, filter', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/students')).send({
      name: 'Nguyen Van Test (fictional)',
      grade: '10',
      subject: 'Toán',
      hourlyRateVnd: 200000,
      parentContact: 'Mẹ: 0900000000',
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;

    const got = await auth(request(server).get(`/api/students/${id}?includeCounts=true`));
    expect(got.status).toBe(200);
    expect(got.body.data.student.name).toBe('Nguyen Van Test (fictional)');
    expect(got.body.data.lessonCount).toBe(0);

    const updated = await auth(request(server).patch(`/api/students/${id}`)).send({ grade: '11' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.grade).toBe('11');

    const search = await auth(request(server).get('/api/students?search=Van%20Test'));
    expect(search.body.data.total).toBe(1);

    const filtered = await auth(request(server).get('/api/students?subject=Toán'));
    expect(filtered.body.data.total).toBe(1);
    const missed = await auth(request(server).get('/api/students?subject=Lý'));
    expect(missed.body.data.total).toBe(0);
  });

  it('archive hides from default list; restore brings back; history preserved', async () => {
    const server = app.getHttpServer();
    const created = await auth(request(server).post('/api/students')).send({ name: 'Archive Probe (fictional)' });
    const id = created.body.data.id as string;
    await prisma.lesson.create({
      data: {
        studentId: id,
        scheduledStart: new Date(),
        scheduledMinutes: 60,
        billableMinutes: 60,
        hourlyRateVnd: 200000,
        tuitionVnd: 200000,
      },
    });

    const archived = await auth(request(server).post(`/api/students/${id}/archive`));
    expect(archived.body.data.isActive).toBe(false);

    const hidden = await auth(request(server).get('/api/students'));
    expect((hidden.body.data.items as { id: string }[]).map((s) => s.id)).not.toContain(id);
    const shown = await auth(request(server).get('/api/students?status=archived'));
    expect(shown.body.data.total).toBeGreaterThanOrEqual(1);

    const restored = await auth(request(server).post(`/api/students/${id}/restore`));
    expect(restored.body.data.isActive).toBe(true);

    const withCounts = await auth(request(server).get(`/api/students/${id}?includeCounts=true`));
    expect(withCounts.body.data.lessonCount).toBe(1);
  });

  it('returns 404 for unknown student', async () => {
    const res = await auth(request(app.getHttpServer()).get('/api/students/no-such-id'));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for missing name and negative rate', async () => {
    const res = await auth(request(app.getHttpServer()).post('/api/students')).send({
      hourlyRateVnd: -1,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });
});
