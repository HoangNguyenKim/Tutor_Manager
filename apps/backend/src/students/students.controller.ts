import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQuery } from './dto/list-students.query';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get()
  async list(@Query() query: ListStudentsQuery) {
    const { total, items } = await this.service.list(query);
    return { ok: true, data: { total, page: query.page ?? 1, pageSize: query.pageSize ?? 20, items } };
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('includeCounts') includeCounts?: string) {
    const result = await this.service.get(id, includeCounts === 'true');
    return { ok: true, data: result };
  }

  @Post()
  async create(@Body() dto: CreateStudentDto) {
    const student = await this.service.create(dto);
    return { ok: true, data: student };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    const student = await this.service.update(id, dto);
    return { ok: true, data: student };
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(@Param('id') id: string) {
    const student = await this.service.archive(id);
    return { ok: true, data: student };
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string) {
    const student = await this.service.restore(id);
    return { ok: true, data: student };
  }
}
