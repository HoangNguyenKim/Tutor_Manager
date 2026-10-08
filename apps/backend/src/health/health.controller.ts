import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { ok: true, data: { ok: true, service: 'tutor-manager-backend', time: new Date().toISOString() } };
  }
}
