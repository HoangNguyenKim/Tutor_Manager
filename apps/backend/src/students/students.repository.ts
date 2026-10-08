import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../db/prisma.service';

export interface StudentListFilter {
  search?: string;
  status?: 'active' | 'archived' | 'all';
  subject?: string;
  page: number;
  pageSize: number;
}

/** SQL only — no business rules here. */
@Injectable()
export class StudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private where(filter: Pick<StudentListFilter, 'search' | 'status' | 'subject'>): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = {};
    if (filter.status === 'active') where.isActive = true;
    else if (filter.status === 'archived') where.isActive = false;
    if (filter.subject) where.subject = filter.subject;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search } },
        { phone: { contains: filter.search } },
        { parentContact: { contains: filter.search } },
      ];
    }
    return where;
  }

  async list(filter: StudentListFilter) {
    const where = this.where(filter);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: Math.min(filter.pageSize, 100),
      }),
    ]);
    return { total, items };
  }

  findById(id: string) {
    return this.prisma.student.findUnique({ where: { id } });
  }

  counts(studentId: string) {
    return this.prisma.$transaction([
      this.prisma.lesson.count({ where: { studentId } }),
      this.prisma.payment.count({ where: { studentId } }),
    ]);
  }

  create(data: Prisma.StudentCreateInput) {
    return this.prisma.student.create({ data });
  }

  update(id: string, data: Prisma.StudentUpdateInput) {
    return this.prisma.student.update({ where: { id }, data });
  }

  setActive(id: string, isActive: boolean) {
    return this.prisma.student.update({ where: { id }, data: { isActive } });
  }
}
