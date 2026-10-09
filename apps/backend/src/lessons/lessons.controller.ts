import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateLessonDto, CreateRecurrenceDto, ListLessonsQuery, UpdateLessonDto } from './dto/lesson.dto';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly service: LessonsService) {}

  @Get()
  async list(@Query() query: ListLessonsQuery) {
    const items = await this.service.list(query);
    return { ok: true, data: { total: items.length, items } };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return { ok: true, data: await this.service.get(id) };
  }

  @Post()
  async create(@Body() dto: CreateLessonDto) {
    return { ok: true, data: await this.service.create(dto) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return { ok: true, data: await this.service.update(id, dto) };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string) {
    return { ok: true, data: await this.service.cancel(id) };
  }

  @Post('recurrence')
  async createRecurrence(@Body() dto: CreateRecurrenceDto) {
    return { ok: true, data: await this.service.createRecurrence(dto) };
  }
}
