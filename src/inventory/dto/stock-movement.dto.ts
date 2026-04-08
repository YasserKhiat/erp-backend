import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { StockMovementType } from '../../common/constants/domain-enums';

export class StockMovementDto {
  @IsString()
  ingredientId: string;

  @IsEnum(StockMovementType)
  type: StockMovementType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
