import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseDailyCashDto {
  @ApiPropertyOptional({ example: '2026-04-08' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ example: 420.5, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualCash: number;

  @ApiPropertyOptional({ example: 'Closing by manager shift A', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
