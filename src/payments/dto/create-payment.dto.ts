import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../common/constants/domain-enums';

export class CreatePaymentDto {
  @ApiProperty({ example: 'cm0abc123orderid' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 42.5, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CARD })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ example: 'POS-TRX-20260408-0001' })
  @IsOptional()
  @IsString()
  transactionRef?: string;
}
