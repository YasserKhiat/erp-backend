import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class FormulaBundleLineDto {
  @ApiProperty({ example: 'cmnmenuitemid123' })
  @IsString()
  menuItemId: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateFormulaBundleDto {
  @ApiProperty({ example: 'Burger + Drink Combo' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Lunch formula bundle' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 11.9 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  price: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ type: [FormulaBundleLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormulaBundleLineDto)
  items: FormulaBundleLineDto[];
}
