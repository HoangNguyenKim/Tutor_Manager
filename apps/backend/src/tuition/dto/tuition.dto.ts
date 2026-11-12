import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountVnd!: number;

  @IsDateString({ strict: true })
  paidAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** Client-supplied idempotency key; repeats return the original row. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}

export class CorrectPaymentDto {
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  newAmountVnd!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(500)
  reason!: string;
}

export class CreateAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsInt()
  @Min(Number.MIN_SAFE_INTEGER)
  @Max(Number.MAX_SAFE_INTEGER)
  amountVnd!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(500)
  reason!: string;
}
