import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentMethod,
  OrderStatus,
  PaymentStatus,
  UserRole,
} from '../common/constants/domain-enums';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CloseDailyCashDto } from './dto/close-daily-cash.dto';
import { CreateMixedPaymentDto } from './dto/create-mixed-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private getDayRange(targetDate?: string) {
    const base = targetDate ? new Date(targetDate) : new Date();
    if (Number.isNaN(base.getTime())) {
      throw new BadRequestException('INVALID_INPUT');
    }

    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private paidTotal(payments: Array<{ status: PaymentStatus; amount: unknown }>): number {
    return this.roundMoney(
      payments
        .filter((payment) => payment.status === PaymentStatus.PAID)
        .reduce((acc, payment) => acc + Number(payment.amount), 0),
    );
  }

  private async getOrderOrThrow(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException('INVALID_ORDER_STATUS');
    }

    return order;
  }

  private async assertNoDuplicateTransactionReferences(
    orderId: string,
    refs: Array<string | undefined>,
  ) {
    const nonEmpty = refs.filter((ref): ref is string => Boolean(ref));
    if (nonEmpty.length === 0) {
      return;
    }

    const hasLocalDuplicates = new Set(nonEmpty).size !== nonEmpty.length;
    if (hasLocalDuplicates) {
      throw new ConflictException('DUPLICATE_PAYMENT_REFERENCE');
    }

    const duplicate = await this.prisma.payment.findFirst({
      where: {
        orderId,
        transactionRef: {
          in: nonEmpty,
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('DUPLICATE_PAYMENT_REFERENCE');
    }
  }

  async createPayment(userId: string, dto: CreatePaymentDto) {
    const order = await this.getOrderOrThrow(dto.orderId);
    const paidSoFar = this.paidTotal(order.payments);

    const orderTotal = Number(order.total);
    if (paidSoFar >= orderTotal) {
      throw new ConflictException('ORDER_ALREADY_PAID');
    }

    const remaining = orderTotal - paidSoFar;

    if (dto.amount > remaining) {
      throw new ConflictException('PAYMENT_EXCEEDS_ORDER_TOTAL');
    }

    await this.assertNoDuplicateTransactionReferences(dto.orderId, [
      dto.transactionRef,
    ]);

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

    const newPaidTotal = this.roundMoney(paidSoFar + Number(payment.amount));

    return {
      payment,
      summary: {
        orderId: order.id,
        orderTotal,
        paidTotal: newPaidTotal,
        remaining: Math.max(0, this.roundMoney(orderTotal - newPaidTotal)),
        isFullyPaid: newPaidTotal >= orderTotal,
      },
    };
  }

  async createMixedPayment(userId: string, dto: CreateMixedPaymentDto) {
    if (!dto.payments.length) {
      throw new BadRequestException('INVALID_INPUT');
    }

    const order = await this.getOrderOrThrow(dto.orderId);
    const paidSoFar = this.paidTotal(order.payments);
    const orderTotal = Number(order.total);

    if (paidSoFar >= orderTotal) {
      throw new ConflictException('ORDER_ALREADY_PAID');
    }

    const mixedTotal = this.roundMoney(
      dto.payments.reduce((acc, payment) => acc + payment.amount, 0),
    );
    const remaining = this.roundMoney(orderTotal - paidSoFar);

    if (mixedTotal > remaining) {
      throw new ConflictException('PAYMENT_EXCEEDS_ORDER_TOTAL');
    }

    await this.assertNoDuplicateTransactionReferences(
      dto.orderId,
      dto.payments.map((payment) => payment.transactionRef),
    );

    const payments = await this.prisma.$transaction(
      dto.payments.map((payment) =>
        this.prisma.payment.create({
          data: {
            orderId: dto.orderId,
            userId,
            amount: payment.amount,
            method: payment.method,
            status: PaymentStatus.PAID,
            transactionRef: payment.transactionRef,
          },
        }),
      ),
    );

    const newPaidTotal = this.roundMoney(paidSoFar + mixedTotal);

    return {
      payments,
      summary: {
        orderId: order.id,
        orderTotal,
        paidTotal: newPaidTotal,
        remaining: Math.max(0, this.roundMoney(orderTotal - newPaidTotal)),
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

  async getMyTransactions(userId: string) {
    return this.prisma.payment.findMany({
      where: {
        order: {
          customerId: userId,
        },
      },
      include: {
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderPayments(
    orderId: string,
    actor: { id: string; role: UserRole },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (actor.role === UserRole.CLIENT && order.customerId !== actor.id) {
      throw new ForbiddenException();
    }

    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    const paidTotal = this.paidTotal(payments);

    return {
      orderId,
      payments,
      paidTotal,
    };
  }

  async getDailyClosing(targetDate?: string) {
    const { start, end } = this.getDayRange(targetDate);

    const savedClosing = await this.prisma.cashClosing.findUnique({
      where: { closedDate: start },
      include: {
        closedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (savedClosing) {
      return {
        date: start.toISOString().slice(0, 10),
        status: 'CLOSED',
        closing: savedClosing,
      };
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });

    const total = this.roundMoney(
      payments.reduce((acc, item) => acc + Number(item.amount), 0),
    );
    const cash = this.roundMoney(
      payments
        .filter((item) => item.method === PaymentMethod.CASH)
        .reduce((acc, item) => acc + Number(item.amount), 0),
    );
    const card = this.roundMoney(
      payments
        .filter((item) => item.method === PaymentMethod.CARD)
        .reduce((acc, item) => acc + Number(item.amount), 0),
    );
    const transfer = this.roundMoney(
      payments
        .filter((item) => item.method === PaymentMethod.TRANSFER)
        .reduce((acc, item) => acc + Number(item.amount), 0),
    );

    return {
      date: start.toISOString().slice(0, 10),
      status: 'OPEN',
      total,
      count: payments.length,
      byMethod: {
        cash,
        card,
        transfer,
      },
    };
  }

  async closeDailyCash(actorId: string, dto: CloseDailyCashDto) {
    const { start, end } = this.getDayRange(dto.date);

    const existing = await this.prisma.cashClosing.findUnique({
      where: { closedDate: start },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('DAILY_CLOSING_ALREADY_EXISTS');
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });

    const expectedCash = this.roundMoney(
      payments
        .filter((payment) => payment.method === PaymentMethod.CASH)
        .reduce((acc, payment) => acc + Number(payment.amount), 0),
    );
    const totalRevenue = this.roundMoney(
      payments.reduce((acc, payment) => acc + Number(payment.amount), 0),
    );
    const discrepancy = this.roundMoney(dto.actualCash - expectedCash);

    const closing = await this.prisma.cashClosing.create({
      data: {
        closedDate: start,
        expectedCash,
        actualCash: dto.actualCash,
        discrepancy,
        totalRevenue,
        totalPayments: payments.length,
        closedById: actorId,
        notes: dto.notes,
      },
      include: {
        closedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return {
      date: start.toISOString().slice(0, 10),
      closing,
    };
  }

  async getTreasurySummary(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date('1970-01-01T00:00:00.000Z');
    const toDate = to ? new Date(to) : new Date();

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      throw new BadRequestException('INVALID_INPUT');
    }

    const [payments, closings] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PAID,
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
      }),
      this.prisma.cashClosing.findMany({
        where: {
          closedDate: {
            gte: fromDate,
            lte: toDate,
          },
        },
        orderBy: {
          closedDate: 'asc',
        },
      }),
    ]);

    const inflow = this.roundMoney(
      payments.reduce((acc, payment) => acc + Number(payment.amount), 0),
    );

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      inflow,
      inflowByMethod: {
        cash: this.roundMoney(
          payments
            .filter((payment) => payment.method === PaymentMethod.CASH)
            .reduce((acc, payment) => acc + Number(payment.amount), 0),
        ),
        card: this.roundMoney(
          payments
            .filter((payment) => payment.method === PaymentMethod.CARD)
            .reduce((acc, payment) => acc + Number(payment.amount), 0),
        ),
        transfer: this.roundMoney(
          payments
            .filter((payment) => payment.method === PaymentMethod.TRANSFER)
            .reduce((acc, payment) => acc + Number(payment.amount), 0),
        ),
      },
      closings,
    };
  }
}
