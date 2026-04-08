import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FavoriteMenuItemDto {
  @ApiProperty({ example: 'cmnmenuitemid123' })
  @IsString()
  menuItemId: string;
}
