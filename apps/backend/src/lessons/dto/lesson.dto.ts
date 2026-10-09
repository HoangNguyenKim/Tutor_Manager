import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  /** ISO-8601 instant (UTC). Wall-clock + zone are resolved client-side before submit. */
  @IsDateString()
  scheduledStart!: string;

  @IsInt()
  @Min(1)
  @Max(480)
  scheduledMinutes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeZone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  hourlyRateVnd?: number;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  scheduledMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeZone?: string;
}

export class ListLessonsQuery {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
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
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @IsInt()
  @Min(1)
  @Max(480)
  scheduledMinutes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeZone?: string;

  @IsDateString()
  validFrom!: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  hourlyRateVnd?: number;
}
