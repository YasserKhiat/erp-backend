import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AbsenceStatus } from '../../common/constants/domain-enums';

export class ListAbsencesQueryDto {
  @ApiPropertyOptional({ example: 'cm0abc123employee' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: AbsenceStatus })
  @IsOptional()
  @IsEnum(AbsenceStatus)
  status?: AbsenceStatus;
}
