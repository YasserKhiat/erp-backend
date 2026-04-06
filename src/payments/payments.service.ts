import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
      throw new BadRequestException('Order not found');
    }

    const paidSoFar = order.payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((acc, payment) => acc + Number(payment.amount), 0);

    if (paidSoFar + dto.amount > Number(order.total)) {
      throw new BadRequestException('Payment exceeds order total');
    }

    return this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        userId,
        amount: dto.amount,
        method: dto.method,
        status: PaymentStatus.PAID,
        transactionRef: dto.transactionRef,
      },
    });
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
