import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsISO8601,
} from 'class-validator';

export class CreateAuctionDto {
  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  auctionType?: string;
  @IsString()
  @IsNotEmpty()
  nftContractId: string;

  @IsString()
  @IsNotEmpty()
  nftTokenId: string;

  @Type(() => Number)
  @IsNumber()
  startPrice: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  reservePrice?: number;

  @IsISO8601()
  @IsOptional()
  startTime?: string;

  @IsISO8601()
  @IsNotEmpty()
  endTime: string;
}
