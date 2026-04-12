import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Client123!' })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ example: 'Client456!' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
