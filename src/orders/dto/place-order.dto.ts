import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OrderType } from '../../common/constants/domain-enums';

export class PlaceOrderDto {
  @IsEnum(OrderType)
  orderType: OrderType;

  @IsOptional()
  @IsInt()
  @Min(1)
  tableNumber?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
