import { Type } from 'class-transformer';
import { IsDateString, IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReservationAvailabilityQueryDto {
  @ApiProperty({ example: '2026-04-09T19:00:00.000Z' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ example: '2026-04-09T21:00:00.000Z' })
  @IsDateString()
  endAt: string;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  guestCount: number;
}
