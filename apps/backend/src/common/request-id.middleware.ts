import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Attaches a request id for log correlation; echoes it back to the caller. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
  (req as Request & { requestId: string }).requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
