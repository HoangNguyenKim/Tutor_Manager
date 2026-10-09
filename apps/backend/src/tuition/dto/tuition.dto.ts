import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsInt()
  @Min(1)
  amountVnd!: number;

  @IsDateString()
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
  newAmountVnd!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class CreateAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsInt()
  amountVnd!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
