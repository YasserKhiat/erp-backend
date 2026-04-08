import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class RemoveOrderItemDto {
  @ApiPropertyOptional({
    example: true,
    description: 'When true, remove entire item; otherwise decrements quantity by one.',
  })
  @IsOptional()
  @IsBoolean()
  removeAll?: boolean;
}
