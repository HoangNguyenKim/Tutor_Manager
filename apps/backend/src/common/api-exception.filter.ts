import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';

function statusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION';
    case 401:
      return 'UNAUTHORIZED';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'BUSINESS_RULE';
    default:
      return `HTTP_${status}`;
  }
}

/** Maps every thrown error to the shared ApiResponse envelope; never leaks stacks. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let code = statusToCode(status);
      let message = exception.message;
      let details: unknown;
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        if (typeof b['code'] === 'string') code = b['code'];
        if (typeof b['message'] === 'string') message = b['message'];
        else if (Array.isArray(b['message'])) {
          message = 'Validation failed';
          details = b['message'];
        }
        if (b['details'] !== undefined) details = b['details'];
      } else if (typeof body === 'string') {
        message = body;
      }
      res.status(status).json({ ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) } });
      return;
    }
    res.status(500).json({ ok: false, error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
}
