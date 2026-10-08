import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule, BACKEND_CONFIG } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import type { BackendConfig } from '../src/config';

const TEST_TOKEN = 'test-local-token-0123456789abcdef';

function testConfig(): BackendConfig {
  return {
    host: '127.0.0.1',
    port: 3001,
    localToken: TEST_TOKEN,
    dataDir: './data',
    logLevel: 'error',
    allowedOrigins: ['http://127.0.0.1:5173'],
  };
}

describe('API infrastructure (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(BACKEND_CONFIG)
      .useValue(testConfig())
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app, testConfig());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health works without a token', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.service).toBe('tutor-manager-backend');
  });

  it('rejects protected routes without a token (401 envelope)', async () => {
    const res = await request(app.getHttpServer()).get('/api/students');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: expect.any(String) },
    });
  });

  it('rejects disallowed origins (401)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/students')
      .set('Origin', 'http://evil.example')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('accepts the install token on protected routes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/students')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns structured 400 for invalid DTOs', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/students')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ name: '', hourlyRateVnd: -5, extra: 'stripped' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('accepts valid DTOs', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/students')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ name: 'Demo', hourlyRateVnd: 100000 });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});
