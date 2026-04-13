import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  NotificationPriority,
  NotificationType,
  UserRole,
} from '@prisma/client';
import {
  LoyaltyUpdatedEvent,
  OrderCancelledEvent,
  OrderCompletedEvent,
  OrderConfirmedEvent,
  PaymentCompletedEvent,
  ReservationCreatedEvent,
  ReservationStatusUpdatedEvent,
  StockLowEvent,
} from '../orders/events';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent('order.confirmed')
  async onOrderConfirmed(event: OrderConfirmedEvent) {
    try {
      await this.notificationsService.notifyRoles(
        [UserRole.EMPLOYEE, UserRole.MANAGER],
        {
          type: NotificationType.ORDER,
          priority: NotificationPriority.INFO,
          title: `Order #${event.order.orderNumber} confirmed`,
          message: `Order ${event.order.orderNumber} is confirmed and ready for preparation flow.`,
          actionUrl: `/orders/${event.order.id}`,
          metadata: {
            orderId: event.order.id,
            orderNumber: event.order.orderNumber,
            orderType: event.order.orderType,
            status: event.order.status,
          },
        },
      );

      if (event.order.customerId) {
        await this.notificationsService.notifyUser(event.order.customerId, {
          type: NotificationType.ORDER,
          priority: NotificationPriority.INFO,
          title: `Your order #${event.order.orderNumber} is confirmed`,
          message: `We confirmed your order. Total: ${event.order.total.toFixed(2)}.`,
          actionUrl: `/orders/${event.order.id}/tracking`,
          metadata: {
            orderId: event.order.id,
            orderNumber: event.order.orderNumber,
            total: event.order.total,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed order notification side effects for order ${event.order.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('payment.completed')
  async onPaymentCompleted(event: PaymentCompletedEvent) {
    try {
      if (event.payment.customerId) {
        await this.notificationsService.notifyUser(event.payment.customerId, {
          type: NotificationType.PAYMENT,
          priority: NotificationPriority.INFO,
          title: `Payment received for order #${event.payment.orderNumber}`,
          message: `We received ${event.payment.amount.toFixed(2)} via ${event.payment.method}.`,
          actionUrl: `/payments/order/${event.payment.orderId}`,
          metadata: {
            paymentId: event.payment.id,
            orderId: event.payment.orderId,
            amount: event.payment.amount,
            method: event.payment.method,
            isFullyPaid: event.payment.isFullyPaid,
          },
        });
      }

      await this.notificationsService.notifyRoles([UserRole.ADMIN, UserRole.MANAGER], {
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.INFO,
        title: `Payment completed for order #${event.payment.orderNumber}`,
        message: `Payment ${event.payment.id} recorded (${event.payment.amount.toFixed(2)}).`,
        actionUrl: `/payments/order/${event.payment.orderId}`,
        metadata: {
          paymentId: event.payment.id,
          orderId: event.payment.orderId,
          orderNumber: event.payment.orderNumber,
          amount: event.payment.amount,
          paidTotal: event.payment.paidTotal,
          orderTotal: event.payment.orderTotal,
          isFullyPaid: event.payment.isFullyPaid,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed payment notification side effects for payment ${event.payment.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('reservation.created')
  async onReservationCreated(event: ReservationCreatedEvent) {
    try {
      if (event.reservation.userId) {
        await this.notificationsService.notifyUser(event.reservation.userId, {
          type: NotificationType.RESERVATION,
          priority: NotificationPriority.INFO,
          title: 'Reservation confirmed',
          message: `Reservation ${event.reservation.id} has been confirmed for ${event.reservation.guestCount} guests.`,
          actionUrl: '/reservations/me',
          metadata: {
            reservationId: event.reservation.id,
            tableId: event.reservation.tableId,
            guestCount: event.reservation.guestCount,
            startAt: event.reservation.startAt,
            endAt: event.reservation.endAt,
          },
        });
      }

      await this.notificationsService.notifyRoles([UserRole.MANAGER, UserRole.EMPLOYEE], {
        type: NotificationType.RESERVATION,
        priority: NotificationPriority.INFO,
        title: 'New reservation created',
        message: `Reservation ${event.reservation.id} is scheduled and needs front-desk awareness.`,
        actionUrl: '/reservations',
        metadata: {
          reservationId: event.reservation.id,
          tableId: event.reservation.tableId,
          startAt: event.reservation.startAt,
          endAt: event.reservation.endAt,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed reservation notification side effects for reservation ${event.reservation.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('reservation.status.updated')
  async onReservationStatusUpdated(event: ReservationStatusUpdatedEvent) {
    try {
      if (event.reservation.userId) {
        await this.notificationsService.notifyUser(event.reservation.userId, {
          type: NotificationType.RESERVATION,
          priority: NotificationPriority.INFO,
          title: 'Reservation status updated',
          message: `Reservation ${event.reservation.id} changed from ${event.reservation.previousStatus} to ${event.reservation.nextStatus}.`,
          actionUrl: '/reservations/me',
          metadata: {
            reservationId: event.reservation.id,
            previousStatus: event.reservation.previousStatus,
            nextStatus: event.reservation.nextStatus,
            startAt: event.reservation.startAt,
            endAt: event.reservation.endAt,
          },
        });
      }

      await this.notificationsService.notifyRoles([UserRole.MANAGER, UserRole.EMPLOYEE], {
        type: NotificationType.RESERVATION,
        priority: NotificationPriority.INFO,
        title: 'Reservation status changed',
        message: `Reservation ${event.reservation.id} changed to ${event.reservation.nextStatus}.`,
        actionUrl: '/reservations',
        metadata: {
          reservationId: event.reservation.id,
          previousStatus: event.reservation.previousStatus,
          nextStatus: event.reservation.nextStatus,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed reservation status notification side effects for reservation ${event.reservation.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('order.completed')
  async onOrderCompleted(event: OrderCompletedEvent) {
    try {
      await this.notificationsService.notifyRoles([UserRole.MANAGER, UserRole.EMPLOYEE], {
        type: NotificationType.ORDER,
        priority: NotificationPriority.INFO,
        title: `Order #${event.order.orderNumber} completed`,
        message: `Order ${event.order.orderNumber} was completed successfully.`,
        actionUrl: `/orders/${event.order.id}`,
        metadata: {
          orderId: event.order.id,
          orderNumber: event.order.orderNumber,
          status: 'COMPLETED',
        },
      });

      await this.notificationsService.notifyUser(event.order.customerId, {
        type: NotificationType.ORDER,
        priority: NotificationPriority.INFO,
        title: `Your order #${event.order.orderNumber} is completed`,
        message: `Order ${event.order.orderNumber} is now completed.`,
        actionUrl: `/orders/${event.order.id}/tracking`,
        metadata: {
          orderId: event.order.id,
          orderNumber: event.order.orderNumber,
          status: 'COMPLETED',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed order completed notification side effects for order ${event.order.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('order.cancelled')
  async onOrderCancelled(event: OrderCancelledEvent) {
    try {
      await this.notificationsService.notifyRoles([UserRole.MANAGER, UserRole.EMPLOYEE], {
        type: NotificationType.ORDER,
        priority: NotificationPriority.WARNING,
        title: `Order #${event.order.orderNumber} cancelled`,
        message: `Order ${event.order.orderNumber} has been cancelled.`,
        actionUrl: `/orders/${event.order.id}`,
        metadata: {
          orderId: event.order.id,
          orderNumber: event.order.orderNumber,
          status: 'CANCELLED',
        },
      });

      if (event.order.customerId) {
        await this.notificationsService.notifyUser(event.order.customerId, {
          type: NotificationType.ORDER,
          priority: NotificationPriority.WARNING,
          title: `Your order #${event.order.orderNumber} was cancelled`,
          message: `Order ${event.order.orderNumber} has been cancelled.`,
          actionUrl: `/orders/${event.order.id}/tracking`,
          metadata: {
            orderId: event.order.id,
            orderNumber: event.order.orderNumber,
            status: 'CANCELLED',
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed order cancelled notification side effects for order ${event.order.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('stock.low')
  async onStockLow(event: StockLowEvent) {
    try {
      const ingredient = await this.prisma.ingredient.findUnique({
        where: { id: event.ingredientId },
        include: {
          inventory: true,
        },
      });

      const ingredientName = ingredient?.name ?? event.ingredientId;
      const currentStock = ingredient?.inventory ? Number(ingredient.inventory.currentStock) : null;
      const minStockLevel = ingredient ? Number(ingredient.minStockLevel) : null;

      await this.notificationsService.notifyRoles([UserRole.ADMIN, UserRole.MANAGER], {
        type: NotificationType.STOCK,
        priority: NotificationPriority.WARNING,
        title: 'Low stock alert',
        message:
          currentStock !== null && minStockLevel !== null
            ? `Ingredient ${ingredientName} is low (${currentStock} <= ${minStockLevel}).`
            : `Ingredient ${ingredientName} reached low stock threshold.`,
        actionUrl: '/inventory',
        metadata: {
          ingredientId: event.ingredientId,
          ingredientName,
          currentStock,
          minStockLevel,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed stock notification side effects for ingredient ${event.ingredientId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('loyalty.updated')
  async onLoyaltyUpdated(event: LoyaltyUpdatedEvent) {
    try {
      await this.notificationsService.notifyUser(event.loyalty.userId, {
        type: NotificationType.LOYALTY,
        priority: NotificationPriority.INFO,
        title: 'Loyalty points updated',
        message: `Loyalty update applied from order #${event.loyalty.orderNumber}.`,
        actionUrl: '/loyalty/me',
        metadata: {
          orderId: event.loyalty.orderId,
          orderNumber: event.loyalty.orderNumber,
          amount: event.loyalty.amount,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed loyalty notification side effects for order ${event.loyalty.orderId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
