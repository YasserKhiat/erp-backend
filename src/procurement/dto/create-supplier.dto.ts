import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'FreshFarm Supplies' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'contact@freshfarm.test' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+212600000001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Zone Industrielle, Casablanca' })
  @IsOptional()
  @IsString()
  address?: string;
}
