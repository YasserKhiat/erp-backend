import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderType } from '../../common/constants/domain-enums';
import { Type } from 'class-transformer';

export class PlaceOrderDto {
  @ApiProperty({ enum: OrderType, example: OrderType.DELIVERY })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  tableNumber?: number;

  @ApiPropertyOptional({ example: 'cmntableid123' })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional({ example: 'No onions please.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  applyLoyaltyAuto?: boolean;
}
