import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('overview')
  async overview(@Query('preset') preset?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return { ok: true, data: await this.service.overview(preset, from, to) };
  }

  @Get('students/:id/history')
  async studentHistory(@Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return { ok: true, data: await this.service.studentHistory(id, from, to) };
  }

  @Get('monthly')
  async monthly(@Query('year') year: string, @Query('month') month: string) {
    return { ok: true, data: await this.service.monthlySummary(year, month) };
  }

  @Get('bonus')
  async bonus(@Query('from') from?: string, @Query('to') to?: string) {
    return { ok: true, data: await this.service.bonusSummary(from, to) };
  }

  @Get('payments')
  async payments(@Query('from') from?: string, @Query('to') to?: string) {
    return { ok: true, data: await this.service.paymentHistory(from, to) };
  }
}
