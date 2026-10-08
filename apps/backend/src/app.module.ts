import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { StudentsModule } from './students/students.module';
import { PrismaModule } from './db/prisma.module';
import { ConfigModule } from './config.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { LocalAuthGuard } from './common/local-auth.guard';
import { LoggingInterceptor } from './common/logging.interceptor';
import { BACKEND_CONFIG } from './config.provider';

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule, StudentsModule],
  providers: [
    { provide: APP_GUARD, useClass: LocalAuthGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}

export { BACKEND_CONFIG };
