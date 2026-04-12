import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RunReconciliationDto {
  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsDateString()
  to: string;
}
