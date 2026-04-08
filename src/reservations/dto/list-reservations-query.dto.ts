import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '../../common/constants/domain-enums';

export class ListReservationsQueryDto {
  @ApiPropertyOptional({ example: 'cmntableid123' })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional({ enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({ example: '2026-04-09T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-04-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
