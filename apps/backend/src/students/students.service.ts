import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateStudentDto } from './dto/create-student.dto';
import type { ListStudentsQuery } from './dto/list-students.query';
import type { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsRepository } from './students.repository';

function trimOrUndefined(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/** Business rules: validation shaping, archive semantics, history protection. */
@Injectable()
export class StudentsService {
  constructor(private readonly repo: StudentsRepository) {}

  list(query: ListStudentsQuery) {
    return this.repo.list({
      search: trimOrUndefined(query.search),
      status: query.status ?? 'active',
      subject: trimOrUndefined(query.subject),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  async get(id: string, includeCounts: boolean) {
    const student = await this.repo.findById(id);
    if (!student) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Student not found' });
    if (!includeCounts) return { student };
    const [lessonCount, paymentCount] = await this.repo.counts(id);
    return { student, lessonCount, paymentCount };
  }

  create(dto: CreateStudentDto) {
    return this.repo.create({
      name: dto.name.trim(),
      phone: trimOrUndefined(dto.phone),
      parentContact: trimOrUndefined(dto.parentContact),
      grade: trimOrUndefined(dto.grade),
      subject: trimOrUndefined(dto.subject),
      hourlyRateVnd: dto.hourlyRateVnd,
      notes: trimOrUndefined(dto.notes),
    });
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.requireExisting(id);
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new ConflictException({ code: 'BUSINESS_RULE', message: 'Name must not be empty' });
    }
    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: trimOrUndefined(dto.phone) } : {}),
      ...(dto.parentContact !== undefined ? { parentContact: trimOrUndefined(dto.parentContact) } : {}),
      ...(dto.grade !== undefined ? { grade: trimOrUndefined(dto.grade) } : {}),
      ...(dto.subject !== undefined ? { subject: trimOrUndefined(dto.subject) } : {}),
      ...(dto.hourlyRateVnd !== undefined ? { hourlyRateVnd: dto.hourlyRateVnd } : {}),
      ...(dto.notes !== undefined ? { notes: trimOrUndefined(dto.notes) } : {}),
    });
  }

  async archive(id: string) {
    const student = await this.requireExisting(id);
    if (!student.isActive) return student;
    return this.repo.setActive(id, false);
  }

  async restore(id: string) {
    const student = await this.requireExisting(id);
    if (student.isActive) return student;
    return this.repo.setActive(id, true);
  }

  private async requireExisting(id: string) {
    const student = await this.repo.findById(id);
    if (!student) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Student not found' });
    return student;
  }
}
