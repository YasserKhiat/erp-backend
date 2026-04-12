import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AbsenceStatus } from '../../common/constants/domain-enums';

export class CreateAbsenceDto {
  @ApiProperty({ example: 'cm0abc123employee' })
  @IsString()
  employeeId: string;

  @ApiProperty({ example: '2026-04-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Medical leave' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ enum: AbsenceStatus, example: AbsenceStatus.PENDING })
  @IsOptional()
  @IsEnum(AbsenceStatus)
  status?: AbsenceStatus;
}
