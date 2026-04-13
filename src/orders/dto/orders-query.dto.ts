import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrderStatus, OrderType } from '../../common/constants/domain-enums';

export class OrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus, description: 'Filter by order status' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: OrderType, description: 'Filter by order type' })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @ApiPropertyOptional({ description: 'Search by order number or customer email/name' })
  @IsOptional()
  @IsString()
  search?: string;
}
