import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../common/constants/domain-enums';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
