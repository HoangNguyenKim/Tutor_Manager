import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  parentContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  grade?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  hourlyRateVnd?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
