import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from '../../common/constants/domain-enums';

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.CONFIRMED })
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}
