import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdjustLoyaltyPointsDto {
  @ApiProperty({ example: 'cm0abc123userid' })
  @IsString()
  userId: string;

  @ApiProperty({ example: -15, description: 'Positive to add points, negative to deduct points.' })
  @IsInt()
  pointsDelta: number;

  @ApiPropertyOptional({ maxLength: 200, example: 'Manual correction after support ticket #402.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
