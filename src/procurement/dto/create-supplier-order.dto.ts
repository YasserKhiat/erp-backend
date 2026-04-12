import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierOrderLineDto {
  @ApiProperty({ example: 'cmningredientid123' })
  @IsString()
  ingredientId: string;

  @ApiPropertyOptional({ example: 'cmncatalogitemid123' })
  @IsOptional()
  @IsString()
  supplierCatalogItemId?: string;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 3.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class CreateSupplierOrderDto {
  @ApiProperty({ example: 'cmnsupplierid123' })
  @IsString()
  supplierId: string;

  @ApiProperty({ type: [SupplierOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplierOrderLineDto)
  items: SupplierOrderLineDto[];

  @ApiPropertyOptional({ example: 'Weekly produce restock' })
  @IsOptional()
  @IsString()
  notes?: string;
}
