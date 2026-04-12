import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationPriority, NotificationType, UserRole } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateTestNotificationDto {
  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.SYSTEM })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationPriority, default: NotificationPriority.INFO })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ example: 'System maintenance notice' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Planned maintenance starts at 23:00 UTC.' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ example: '/admin/maintenance' })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: false })
  actionUrl?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { source: 'manual-test' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'clx123abc456' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  targetUserId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['clx123abc456', 'clx987def654'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  targetUserIds?: string[];

  @ApiPropertyOptional({ enum: UserRole, isArray: true, example: [UserRole.MANAGER] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(UserRole, { each: true })
  targetRoles?: UserRole[];
}
