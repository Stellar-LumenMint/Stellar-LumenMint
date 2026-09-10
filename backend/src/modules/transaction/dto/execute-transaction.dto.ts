import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class ExecuteTransactionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxGas?: number;

  @IsOptional()
  config?: Record<string, unknown>;
}
