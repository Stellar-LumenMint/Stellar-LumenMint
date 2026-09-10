import { IsOptional, IsString, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { AuctionStatus } from '../interfaces/auction.interface';

export class AuctionQueryDto {
  @IsOptional()
  @IsIn(Object.values(AuctionStatus))
  status?: AuctionStatus;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  nftContractId?: string;

  @IsOptional()
  @IsString()
  nftTokenId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
