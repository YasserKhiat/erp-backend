import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../common/constants/domain-enums';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PREPARING })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
