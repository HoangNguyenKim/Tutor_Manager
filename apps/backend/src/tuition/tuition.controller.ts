import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { CorrectPaymentDto, CreateAdjustmentDto, CreatePaymentDto } from './dto/tuition.dto';
import { TuitionService } from './tuition.service';

@Controller()
export class TuitionController {
  constructor(private readonly service: TuitionService) {}

  @Get('students/:id/statement')
  async statement(
    @Param('id') id: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = Number(year);
    const m = Number(month);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return { ok: false, error: { code: 'VALIDATION', message: 'year/month must be valid (month 1-12)' } };
    }
    return { ok: true, data: await this.service.statement(id, y, m) };
  }

  @Get('students/:id/payments')
  async listPayments(@Param('id') id: string) {
    return { ok: true, data: await this.service.listPayments(id) };
  }

  @Post('payments')
  async createPayment(@Body() dto: CreatePaymentDto) {
    const { payment, duplicate } = await this.service.createPayment(dto);
    return { ok: true, data: { payment, duplicate } };
  }

  @Patch('payments/:id/correct')
  async correctPayment(@Param('id') id: string, @Body() dto: CorrectPaymentDto) {
    return { ok: true, data: await this.service.correctPayment(id, dto) };
  }

  @Post('adjustments')
  @HttpCode(HttpStatus.CREATED)
  async createAdjustment(@Body() dto: CreateAdjustmentDto) {
    return { ok: true, data: await this.service.createAdjustment(dto) };
  }
}
