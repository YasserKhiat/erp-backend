import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Classic Burger' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Beef patty, lettuce, tomato, house sauce' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 8.9 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  price: number;

  @ApiProperty({ example: 'cmncategoryid123' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  vegetarian?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  halal?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  glutenFree?: boolean;
}
