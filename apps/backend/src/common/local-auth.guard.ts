import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { BACKEND_CONFIG } from '../config.provider';
import type { BackendConfig } from '../config';
import { IS_PUBLIC_KEY } from './public.decorator';

function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Loopback-only guard. Every request must arrive via a loopback Host
 * (DNS-rebinding protection) with an allowlisted-or-absent Origin.
 * Non-public routes additionally require the install bearer token, so
 * arbitrary web pages cannot use the API just because it is on localhost.
 */
@Injectable()
export class LocalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(BACKEND_CONFIG) private readonly config: BackendConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const hostname = (req.headers.host ?? '').split(':')[0]?.toLowerCase();
    if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
      throw new UnauthorizedException('Untrusted host');
    }
    const origin = req.headers.origin;
    if (typeof origin === 'string' && origin !== 'null' && !this.config.allowedOrigins.includes(origin)) {
      throw new UnauthorizedException('Origin not allowed');
    }
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const auth = req.headers.authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      if (tokensEqual(auth.slice('Bearer '.length), this.config.localToken)) return true;
    }
    throw new UnauthorizedException('Missing or invalid local API token');
  }
}
