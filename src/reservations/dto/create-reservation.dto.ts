import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: 'cmntableid123' })
  @IsString()
  tableId: string;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  guestCount: number;

  @ApiProperty({ example: '2026-04-09T19:00:00.000Z' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ example: '2026-04-09T21:00:00.000Z' })
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional({ example: 'Window side please' })
  @IsOptional()
  @IsString()
  notes?: string;
}
