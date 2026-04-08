import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '../../common/constants/domain-enums';

export class StockMovementHistoryQueryDto {
  @ApiPropertyOptional({ example: 'cmningredientid123' })
  @IsOptional()
  @IsString()
  ingredientId?: string;

  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: (typeof StockMovementType)[keyof typeof StockMovementType];

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-04-08T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
