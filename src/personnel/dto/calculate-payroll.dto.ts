import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CalculatePayrollDto {
  @ApiProperty({ example: 'cm0abc123employee' })
  @IsString()
  employeeId: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional({ example: 0.0448, minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  cnssRate?: number;

  @ApiPropertyOptional({ example: 0.1, minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  taxRate?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  otherDeduction?: number;
}
