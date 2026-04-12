import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CalculatePayrollDto } from './calculate-payroll.dto';

export class RunPayrollDto extends CalculatePayrollDto {
  @ApiPropertyOptional({ example: 'April payroll run' })
  @IsOptional()
  @IsString()
  notes?: string;
}
