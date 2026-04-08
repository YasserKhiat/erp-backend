import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { LoyaltyUpdatedEvent, PaymentCompletedEvent } from '../../orders/events';

@Injectable()
export class PaymentListener {
  private readonly logger = new Logger(PaymentListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('payment.completed')
  async onPaymentCompleted(event: PaymentCompletedEvent) {
    this.logger.log(`Received payment.completed for payment ${event.payment.id}`);
    try {
      const day = new Date();
      day.setHours(0, 0, 0, 0);

      await this.prisma.dailyStat.upsert({
        where: { date: day },
        update: {
          totalRevenue: {
            increment: event.payment.amount,
          },
        },
        create: {
          date: day,
          totalOrders: 0,
          totalRevenue: event.payment.amount,
        },
      });

      if (event.payment.customerId && event.payment.isFullyPaid) {
        this.logger.log(`Emitting loyalty.updated for order ${event.payment.orderId}`);
        this.eventEmitter.emit('loyalty.updated', {
          loyalty: {
            orderId: event.payment.orderId,
            orderNumber: event.payment.orderNumber,
            userId: event.payment.customerId,
            amount: event.payment.orderTotal,
          },
        } as LoyaltyUpdatedEvent);
      }
    } catch (error) {
      this.logger.error(
        `Failed payment.completed side effects for payment ${event.payment.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
