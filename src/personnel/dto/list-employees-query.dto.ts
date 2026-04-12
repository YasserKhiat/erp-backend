import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EmploymentStatus } from '../../common/constants/domain-enums';

export class ListEmployeesQueryDto {
  @ApiPropertyOptional({ enum: EmploymentStatus })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  status?: EmploymentStatus;

  @ApiPropertyOptional({ example: 'chef' })
  @IsOptional()
  @IsString()
  search?: string;
}
