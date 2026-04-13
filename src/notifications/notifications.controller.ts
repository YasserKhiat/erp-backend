import { Body, Controller, Get, MessageEvent, Param, Patch, Post, Query, Sse, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole as DomainUserRole } from '../common/constants/domain-enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ApiContractErrors,
  ApiContractListOk,
  ApiContractOk,
} from '../common/swagger/api-contract.decorators';
import { CreateTestNotificationDto } from './dto/create-test-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsRealtimeService } from './notifications-realtime.service';
import { NotificationsService } from './notifications.service';
import { Observable } from 'rxjs';

@ApiTags('notifications')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsRealtimeService: NotificationsRealtimeService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiQuery({
    name: 'type',
    enum: NotificationType,
    required: false,
    description: 'Notification type filter',
  })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated notifications list for current user.' })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
  @Roles(
    DomainUserRole.CLIENT,
    DomainUserRole.EMPLOYEE,
    DomainUserRole.MANAGER,
    DomainUserRole.ADMIN,
  )
  getMyNotifications(
    @CurrentUser() user: { id: string },
    @Query() query?: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listMyNotifications(user.id, query);
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Live notification stream for current user (SSE)' })
  @Roles(
    DomainUserRole.CLIENT,
    DomainUserRole.EMPLOYEE,
    DomainUserRole.MANAGER,
    DomainUserRole.ADMIN,
  )
  streamNotifications(@CurrentUser() user: { id: string }): Observable<MessageEvent> {
    return this.notificationsRealtimeService.streamForUser(user.id);
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Get unread notifications count for current user' })
  @ApiContractOk({
    description: 'Unread notifications count.',
    dataSchema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 3 },
      },
      required: ['count'],
    },
  })
  @Roles(
    DomainUserRole.CLIENT,
    DomainUserRole.EMPLOYEE,
    DomainUserRole.MANAGER,
    DomainUserRole.ADMIN,
  )
  getUnreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read for current user' })
  @ApiContractOk({
    description: 'Notification marked as read.',
    dataSchema: {
      type: 'object',
      properties: {
        notificationId: { type: 'string' },
        isRead: { type: 'boolean', example: true },
        readAt: { type: 'string', format: 'date-time', nullable: true },
      },
      required: ['notificationId', 'isRead'],
    },
  })
  @Roles(
    DomainUserRole.CLIENT,
    DomainUserRole.EMPLOYEE,
    DomainUserRole.MANAGER,
    DomainUserRole.ADMIN,
  )
  markAsRead(@CurrentUser() user: { id: string }, @Param('id') notificationId: string) {
    return this.notificationsService.markAsRead(user.id, notificationId);
  }

  @Patch('me/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiContractOk({
    description: 'All unread notifications marked as read.',
    dataSchema: {
      type: 'object',
      properties: {
        updatedCount: { type: 'number', example: 5 },
      },
      required: ['updatedCount'],
    },
  })
  @Roles(
    DomainUserRole.CLIENT,
    DomainUserRole.EMPLOYEE,
    DomainUserRole.MANAGER,
    DomainUserRole.ADMIN,
  )
  markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Create a test notification (admin/manager)' })
  @ApiBody({ type: CreateTestNotificationDto })
  @ApiContractOk({
    description: 'Test notification created.',
    dataSchema: {
      type: 'object',
      properties: {
        notificationId: { type: 'string' },
        recipientsCount: { type: 'number', example: 2 },
        type: { type: 'string', example: 'SYSTEM' },
        title: { type: 'string' },
      },
      required: ['notificationId', 'recipientsCount', 'type', 'title'],
    },
  })
  @Roles(DomainUserRole.ADMIN, DomainUserRole.MANAGER)
  createTestNotification(@Body() dto: CreateTestNotificationDto) {
    return this.notificationsService.createTestNotification(dto);
  }
}
