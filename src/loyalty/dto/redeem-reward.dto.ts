import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class RedeemRewardDto {
  @ApiProperty({ minimum: 1, example: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
