import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../common/constants/domain-enums';

class MixedPaymentItemDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CARD })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 25.5, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'TXN-MIX-001' })
  @IsOptional()
  @IsString()
  transactionRef?: string;
}

export class CreateMixedPaymentDto {
  @ApiProperty({ example: 'cm0abc123orderid' })
  @IsString()
  orderId: string;

  @ApiProperty({ type: [MixedPaymentItemDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => MixedPaymentItemDto)
  payments: MixedPaymentItemDto[];
}
