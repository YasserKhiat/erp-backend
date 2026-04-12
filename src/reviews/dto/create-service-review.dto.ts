import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateServiceReviewDto {
  @ApiPropertyOptional({ example: 'cm0abc123orderid' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 4 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ maxLength: 800, example: 'Excellent service and timing.' })
  @IsOptional()
  @IsString()
  @MaxLength(800)
  comment?: string;
}
