import { BadRequestException, ValidationPipe, type INestApplication } from '@nestjs/common';
import type { BackendConfig } from './config';
import { requestIdMiddleware } from './common/request-id.middleware';

export function configureApp(app: INestApplication, config: BackendConfig): void {
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.allowedOrigins });
  app.use(requestIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const details = errors.map((e) => ({
          property: e.property,
          constraints: e.constraints,
        }));
        return new BadRequestException({
          code: 'VALIDATION',
          message: 'Validation failed',
          details,
        });
      },
    }),
  );
  app.enableShutdownHooks();
}
