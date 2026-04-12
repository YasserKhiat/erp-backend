import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { ReservationStatus } from '../../common/constants/domain-enums';
import {
  OrderCreatedEvent,
  ReservationCreatedEvent,
  StockLowEvent,
} from '../../orders/events';
import { MailService } from '../../notifications/mail.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @OnEvent('stock.low')
  onStockLow(event: StockLowEvent) {
    this.logger.warn(`Notification alert: low stock for ingredient ${event.ingredientId}`);
  }

  @OnEvent('reservation.created')
  async onReservationCreated(event: ReservationCreatedEvent) {
    this.logger.log(`Notification event: reservation ${event.reservation.id} created`);

    if (!event.reservation.userId) {
      return;
    }

    try {
      const [user, table] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: event.reservation.userId },
          select: { email: true, fullName: true },
        }),
        this.prisma.diningTable.findUnique({
          where: { id: event.reservation.tableId },
          select: { code: true },
        }),
      ]);

      if (!user?.email) {
        return;
      }

      const startAt = new Date(event.reservation.startAt).toLocaleString();
      const endAt = new Date(event.reservation.endAt).toLocaleString();

      await this.mailService.sendMail({
        to: user.email,
        subject: `Reservation confirmed #${event.reservation.id}`,
        text:
          `Hello ${user.fullName},\n\n` +
          `Your reservation is confirmed.\n` +
          `Reservation ID: ${event.reservation.id}\n` +
          `Table: ${table?.code ?? event.reservation.tableId}\n` +
          `Guests: ${event.reservation.guestCount}\n` +
          `Start: ${startAt}\n` +
          `End: ${endAt}\n\n` +
          `Thank you.`,
      });
    } catch (error) {
      this.logger.error(
        `Failed reservation confirmation email for ${event.reservation.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('order.created')
  async onOrderCreated(event: OrderCreatedEvent) {
    if (!event.order.customerId) {
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: event.order.customerId },
        select: { email: true, fullName: true },
      });

      if (!user?.email) {
        return;
      }

      const itemsBlock = event.order.items
        .map(
          (item) =>
            `- ${item.menuItemName} x${item.quantity} = ${item.lineTotal.toFixed(2)}`,
        )
        .join('\n');

      await this.mailService.sendMail({
        to: user.email,
        subject: `Order confirmation #${event.order.orderNumber}`,
        text:
          `Hello ${user.fullName},\n\n` +
          `Your order has been confirmed.\n` +
          `Order ID: ${event.order.id}\n` +
          `Order Number: ${event.order.orderNumber}\n` +
          `Type: ${event.order.orderType}\n` +
          `Status: ${event.order.status}\n` +
          (event.order.loyaltyDiscount > 0
            ? `Loyalty discount: ${event.order.loyaltyDiscount.toFixed(2)}\n`
            : '') +
          `Total: ${event.order.total.toFixed(2)}\n\n` +
          `Items:\n${itemsBlock}\n\n` +
          `Thank you.`,
      });
    } catch (error) {
      this.logger.error(
        `Failed order confirmation email for ${event.order.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @Cron('0 * * * *')
  async sendReservationReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        userId: {
          not: null,
        },
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        },
        startAt: {
          gte: windowStart,
          lte: windowEnd,
        },
        reminderSentAt: null,
      },
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
        table: {
          select: {
            code: true,
          },
        },
      },
      take: 100,
    });

    for (const reservation of reservations) {
      if (!reservation.user?.email) {
        continue;
      }

      try {
        await this.mailService.sendMail({
          to: reservation.user.email,
          subject: `Reservation reminder #${reservation.id}`,
          text:
            `Hello ${reservation.user.fullName},\n\n` +
            `This is a reminder for your reservation tomorrow.\n` +
            `Reservation ID: ${reservation.id}\n` +
            `Table: ${reservation.table.code}\n` +
            `Start: ${reservation.startAt.toLocaleString()}\n` +
            `Guests: ${reservation.guestCount}\n\n` +
            `See you soon.`,
        });

        await this.prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            reminderSentAt: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed reservation reminder email for ${reservation.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
