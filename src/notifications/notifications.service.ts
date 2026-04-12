import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationPriority,
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { resolvePagination } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestNotificationDto } from './dto/create-test-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

type CreateNotificationInput = {
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyUser(userId: string, input: CreateNotificationInput) {
    return this.notifyUsers([userId], input);
  }

  async notifyUsers(userIds: string[], input: CreateNotificationInput) {
    const recipients = await this.resolveActiveUserIds(userIds);
    if (recipients.length === 0) {
      return null;
    }

    return this.prisma.notification.create({
      data: {
        type: input.type,
        priority: input.priority ?? NotificationPriority.INFO,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
        metadata: input.metadata,
        recipients: {
          create: recipients.map((userId) => ({ userId })),
        },
      },
      include: {
        recipients: {
          select: {
            userId: true,
          },
        },
      },
    });
  }

  async notifyRoles(roles: UserRole[], input: CreateNotificationInput) {
    if (!roles.length) {
      return null;
    }

    const users = await this.prisma.user.findMany({
      where: {
        role: { in: roles },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return this.notifyUsers(
      users.map((user) => user.id),
      input,
    );
  }

  async listMyNotifications(
    userId: string,
    query?: ListNotificationsQueryDto,
  ) {
    const { page, limit, start } = resolvePagination(query);

    const where: Prisma.NotificationRecipientWhereInput = {
      userId,
      ...(query?.isRead !== undefined ? { isRead: query.isRead } : {}),
      ...(query?.type
        ? {
            notification: {
              type: query.type,
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.notificationRecipient.count({ where }),
      this.prisma.notificationRecipient.findMany({
        where,
        orderBy: {
          notification: {
            createdAt: 'desc',
          },
        },
        skip: start,
        take: limit,
        include: {
          notification: true,
        },
      }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.notification.id,
        type: row.notification.type,
        priority: row.notification.priority,
        title: row.notification.title,
        message: row.notification.message,
        actionUrl: row.notification.actionUrl,
        metadata: row.notification.metadata,
        isRead: row.isRead,
        createdAt: row.notification.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notificationRecipient.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }

  async markAsRead(userId: string, notificationId: string) {
    const existing = await this.prisma.notificationRecipient.findUnique({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      select: {
        notificationId: true,
        isRead: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    }

    if (existing.isRead) {
      return {
        notificationId,
        isRead: true,
      };
    }

    const updated = await this.prisma.notificationRecipient.update({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: {
        notificationId: true,
        isRead: true,
        readAt: true,
      },
    });

    return updated;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notificationRecipient.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  async createTestNotification(dto: CreateTestNotificationDto) {
    const directUserIds = [
      ...(dto.targetUserId ? [dto.targetUserId] : []),
      ...(dto.targetUserIds ?? []),
    ];

    const roleUserIds = dto.targetRoles?.length
      ? (
          await this.prisma.user.findMany({
            where: {
              role: { in: dto.targetRoles },
              isActive: true,
            },
            select: {
              id: true,
            },
          })
        ).map((user) => user.id)
      : [];

    const recipientIds = Array.from(new Set([...directUserIds, ...roleUserIds]));

    if (!recipientIds.length) {
      throw new BadRequestException('NOTIFICATION_TARGET_REQUIRED');
    }

    const created = await this.notifyUsers(recipientIds, {
      type: dto.type ?? NotificationType.SYSTEM,
      priority: dto.priority ?? NotificationPriority.INFO,
      title: dto.title,
      message: dto.message,
      actionUrl: dto.actionUrl,
      metadata: dto.metadata as Prisma.InputJsonValue,
    });

    if (!created) {
      throw new BadRequestException('NOTIFICATION_TARGET_REQUIRED');
    }

    return {
      notificationId: created.id,
      recipientsCount: created.recipients.length,
      type: created.type,
      title: created.title,
    };
  }

  private async resolveActiveUserIds(userIds: string[]) {
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    if (!ids.length) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return users.map((user) => user.id);
  }
}
