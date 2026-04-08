import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClientPreferencesDto {
  @ApiPropertyOptional({ example: 'No pork, halal only' })
  @IsOptional()
  @IsString()
  dietaryRestrictions?: string;

  @ApiPropertyOptional({ example: 'Peanuts' })
  @IsOptional()
  @IsString()
  allergens?: string;

  @ApiPropertyOptional({ example: 'Leave at reception desk' })
  @IsOptional()
  @IsString()
  preferredDeliveryNotes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}
