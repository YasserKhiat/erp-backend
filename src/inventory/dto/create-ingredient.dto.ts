import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsString()
  unit: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  minStockLevel: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  initialStock: number;
}
