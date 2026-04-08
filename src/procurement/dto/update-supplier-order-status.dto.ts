import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SupplierOrderStatus } from '../../common/constants/domain-enums';

export class UpdateSupplierOrderStatusDto {
  @ApiProperty({
    enum: SupplierOrderStatus,
    example: SupplierOrderStatus.SUBMITTED,
  })
  @IsEnum(SupplierOrderStatus)
  status: SupplierOrderStatus;
}
