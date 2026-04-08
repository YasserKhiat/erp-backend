import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class RecipeIngredientDto {
  @ApiProperty({ example: 'cmningredientid123' })
  @IsString()
  ingredientId: string;

  @ApiProperty({ example: 1.2 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  quantityNeeded: number;
}

export class SetMenuItemRecipeDto {
  @ApiProperty({ type: [RecipeIngredientDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients: RecipeIngredientDto[];
}
