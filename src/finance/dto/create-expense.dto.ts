import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../../common/constants/domain-enums';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Rent April' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.FIXED })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({ example: 1500, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-04-08' })
  @IsString()
  expenseDate: string;

  @ApiPropertyOptional({ example: 'Monthly lease payment', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
