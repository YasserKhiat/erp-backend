import { StockMovementType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class StockMovementDto {
  @IsString()
  ingredientId: string;

  @IsEnum(StockMovementType)
  type: StockMovementType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  quantity: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
