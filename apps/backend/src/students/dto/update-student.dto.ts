import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

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
  @IsString()
  @MaxLength(60)
  subject?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  hourlyRateVnd?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
