import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  price: number;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
