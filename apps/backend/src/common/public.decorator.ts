import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'tutorManager:isPublic';

/** Marks a route as reachable without a bearer token (still loopback + origin checked). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
