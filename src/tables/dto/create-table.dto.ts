import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({ example: 'T01' })
  @IsString()
  code: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  seats: number;

  @ApiProperty({ example: 'cmnemployeeid123', required: false })
  @IsOptional()
  @IsString()
  assignedWaiterId?: string;
}
