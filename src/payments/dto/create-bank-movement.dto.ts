import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BankMovementType } from '../../common/constants/domain-enums';

export class CreateBankMovementDto {
  @ApiProperty({ example: '2026-04-12' })
  @IsDateString()
  movementDate: string;

  @ApiProperty({ example: 350.5, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: BankMovementType, example: BankMovementType.CREDIT })
  @IsEnum(BankMovementType)
  type: BankMovementType;

  @ApiPropertyOptional({ example: 'BANK-STMT-001' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'POS settlement from bank statement' })
  @IsOptional()
  @IsString()
  notes?: string;
}
