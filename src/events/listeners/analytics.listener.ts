import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrderCancelledEvent,
  OrderCompletedEvent,
  ReservationCreatedEvent,
} from '../../orders/events';

@Injectable()
export class AnalyticsListener {
  private readonly logger = new Logger(AnalyticsListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('order.completed')
  async onOrderCompleted(event: OrderCompletedEvent) {
    this.logger.log(`Received order.completed for order ${event.order.id}`);
    try {
      const day = new Date();
      day.setHours(0, 0, 0, 0);

      await this.prisma.dailyStat.upsert({
        where: { date: day },
        update: {
          totalOrders: {
            increment: 1,
          },
        },
        create: {
          date: day,
          totalOrders: 1,
          totalRevenue: 0,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed analytics update for order ${event.order.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('order.cancelled')
  onOrderCancelled(event: OrderCancelledEvent) {
    this.logger.warn(`Received order.cancelled for order ${event.order.id}`);
  }

  @OnEvent('reservation.created')
  onReservationCreated(event: ReservationCreatedEvent) {
    this.logger.log(`Received reservation.created for reservation ${event.reservation.id}`);
  }
}
