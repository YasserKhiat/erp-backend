import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignWaiterDto {
  @ApiPropertyOptional({ example: 'cmnemployeeid123' })
  @IsOptional()
  @IsString()
  waiterId?: string;
}
