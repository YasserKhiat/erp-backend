import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus, OrderType } from '../../common/constants/domain-enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class OrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: (typeof OrderStatus)[keyof typeof OrderStatus];

  @ApiPropertyOptional({ enum: OrderType })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: (typeof OrderType)[keyof typeof OrderType];

  @ApiPropertyOptional({
    description: 'Search by order number, bill number, customer info, table code, or order id.',
    example: '10025',
  })
  @IsOptional()
  @IsString()
  search?: string;
}