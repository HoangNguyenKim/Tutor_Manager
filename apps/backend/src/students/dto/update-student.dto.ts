import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateStudentDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/\S/)
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
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  hourlyRateVnd?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
