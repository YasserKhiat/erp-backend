import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderType } from '../../common/constants/domain-enums';

export class PlaceOrderDto {
  @ApiProperty({ enum: OrderType, example: OrderType.DELIVERY })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  tableNumber?: number;

  @ApiPropertyOptional({ example: 'No onions please.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
