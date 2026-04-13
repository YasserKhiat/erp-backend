import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: NotificationType, example: NotificationType.ORDER })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({
    example: false,
    description: 'Filter by read state. true = read, false = unread',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return value;
  })
  @IsBoolean()
  isRead?: boolean;
}
