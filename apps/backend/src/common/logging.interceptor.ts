import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/** Structured request log: method + path + status + duration only. No query, body, headers, or PII. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{ method: string; path: string; requestId?: string }>();
    const res = http.getResponse<{ statusCode: number }>();
    const started = Date.now();
    const requestId = req.requestId ?? '-';
    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms id=${requestId}`),
        error: () => this.logger.warn(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms id=${requestId}`),
      }),
    );
  }
}
