import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const SUBJECTS = ['Toán', 'Văn', 'Anh', 'Sinh', 'Hóa', 'Lý'] as const;

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  /** ISO-8601 instant (UTC). Wall-clock + zone are resolved client-side before submit. */
  @IsDateString({ strict: true })
  scheduledStart!: string;

  @IsInt()
  @Min(1)
  @Max(480)
  scheduledMinutes!: number;

  @IsIn(SUBJECTS)
  subject!: (typeof SUBJECTS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeZone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  hourlyRateVnd?: number;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsDateString({ strict: true })
  scheduledStart?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  scheduledMinutes?: number;

  @IsOptional()
  @IsIn(SUBJECTS)
  subject?: (typeof SUBJECTS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeZone?: string;
}

export class ListLessonsQuery {
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  subject?: string;

  @IsOptional()
  @IsIn(['scheduled', 'completed', 'cancelled', 'all'])
  status?: 'scheduled' | 'completed' | 'cancelled' | 'all';
}

export class CompleteLessonDto {
  @IsInt()
  @Min(1)
  @Max(480)
  actualMinutes!: number;

  @IsOptional()
  @IsBoolean()
  bonusBillable?: boolean;

  @IsOptional()
  @IsIn(['actual', 'planned'])
  billingPolicy?: 'actual' | 'planned';
}

export class CorrectLessonDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  actualMinutes?: number;

  @IsOptional()
  @IsBoolean()
  bonusBillable?: boolean;
}

export class CreateRecurrenceDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  /** 0=Sunday..6=Saturday */
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  /** HH:mm wall-clock in timeZone */
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @IsInt()
  @Min(1)
  @Max(480)
  scheduledMinutes!: number;

  @IsIn(SUBJECTS)
  subject!: (typeof SUBJECTS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeZone?: string;

  @IsDateString({ strict: true })
  validFrom!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  validUntil?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  hourlyRateVnd?: number;
}
