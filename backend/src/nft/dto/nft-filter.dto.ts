import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class NftFilterDto {
  @ApiProperty({ required: false, description: 'Stellar Contract ID (C...)' })
  @IsString()
  @IsOptional()
  contractId?: string;

  @ApiProperty({ required: false, description: 'Stellar Account ID (G...)' })
  @IsString()
  @IsOptional()
  owner?: string;

  @ApiProperty({ required: false, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, minimum: 1, default: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiProperty({
    required: false,
    enum: ['mintedAt', 'price', 'views'],
    default: 'mintedAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: 'mintedAt' | 'price' | 'views' = 'mintedAt';
}
