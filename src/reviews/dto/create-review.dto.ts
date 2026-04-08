import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'cm0abc123orderid' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'cm0abc123orderitemid' })
  @IsString()
  orderItemId: string;

  @ApiProperty({ example: 'cm0abc123menuitemid' })
  @IsString()
  menuItemId: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ maxLength: 800, example: 'Great taste and very fresh.' })
  @IsOptional()
  @IsString()
  @MaxLength(800)
  comment?: string;
}
