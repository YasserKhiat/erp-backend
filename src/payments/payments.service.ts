import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '../common/constants/domain-enums';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(userId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException('INVALID_ORDER_STATUS');
    }

    const paidSoFar = order.payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((acc, payment) => acc + Number(payment.amount), 0);

    const orderTotal = Number(order.total);
    if (paidSoFar >= orderTotal) {
      throw new ConflictException('ORDER_ALREADY_PAID');
    }

    const remaining = orderTotal - paidSoFar;

    if (dto.amount > remaining) {
      throw new ConflictException('PAYMENT_EXCEEDS_ORDER_TOTAL');
    }

    if (dto.transactionRef) {
      const duplicateTx = await this.prisma.payment.findFirst({
        where: {
          orderId: dto.orderId,
          transactionRef: dto.transactionRef,
        },
        select: { id: true },
      });

      if (duplicateTx) {
        throw new ConflictException('DUPLICATE_PAYMENT_REFERENCE');
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        userId,
        amount: dto.amount,
        method: dto.method,
        status: PaymentStatus.PAID,
        transactionRef: dto.transactionRef,
      },
    });

    const newPaidTotal = paidSoFar + Number(payment.amount);

    return {
      payment,
      summary: {
        orderId: order.id,
        orderTotal,
        paidTotal: newPaidTotal,
        remaining: Math.max(0, orderTotal - newPaidTotal),
        isFullyPaid: newPaidTotal >= orderTotal,
      },
    };
  }

  getTransactions() {
    return this.prisma.payment.findMany({
      include: { order: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDailyClosing(targetDate?: string) {
    const date = targetDate ? new Date(targetDate) : new Date();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });

    const total = payments.reduce((acc, item) => acc + Number(item.amount), 0);

    return {
      date: start.toISOString().slice(0, 10),
      total,
      count: payments.length,
      byMethod: {
        cash: payments
          .filter((item) => item.method === 'CASH')
          .reduce((acc, item) => acc + Number(item.amount), 0),
        card: payments
          .filter((item) => item.method === 'CARD')
          .reduce((acc, item) => acc + Number(item.amount), 0),
      },
    };
  }
}
