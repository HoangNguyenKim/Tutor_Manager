import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule, BACKEND_CONFIG } from './app.module';
import type { BackendConfig } from './config';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<BackendConfig>(BACKEND_CONFIG);
  configureApp(app, config);
  await app.listen(config.port, config.host);
}

bootstrap().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
