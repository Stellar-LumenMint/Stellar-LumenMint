import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class PlaceBidDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
