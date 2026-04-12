import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '../../common/constants/domain-enums';

export class CreateAttendanceDto {
  @ApiProperty({ example: 'cm0abc123employee' })
  @IsString()
  employeeId: string;

  @ApiProperty({ example: '2026-04-12' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '2026-04-12T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @ApiPropertyOptional({ example: '2026-04-12T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkOutAt?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ example: 'Morning shift' })
  @IsOptional()
  @IsString()
  notes?: string;
}
