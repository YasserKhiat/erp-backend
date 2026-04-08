import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ExpenseCategory,
  PaymentStatus,
} from '../common/constants/domain-enums';
import { PrismaService } from '../prisma/prisma.service';
import { AnnualSummaryQueryDto } from './dto/annual-summary-query.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { RevenueQueryDto } from './dto/revenue-query.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private parseDateOrThrow(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('INVALID_INPUT');
    }

    return parsed;
  }

  private formatBucket(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
    if (period === 'daily') {
      return date.toISOString().slice(0, 10);
    }

    if (period === 'monthly') {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = weekStart.getUTCDay() || 7;
    weekStart.setUTCDate(weekStart.getUTCDate() - day + 1);
    return weekStart.toISOString().slice(0, 10);
  }

  async createExpense(actorId: string, dto: CreateExpenseDto) {
    const expenseDate = this.parseDateOrThrow(dto.expenseDate);
    if (!expenseDate) {
      throw new BadRequestException('INVALID_INPUT');
    }

    return this.prisma.expense.create({
      data: {
        title: dto.title,
        category: dto.category,
        amount: dto.amount,
        expenseDate,
        paidById: actorId,
        notes: dto.notes,
      },
      include: {
        paidBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async listExpenses(query: ListExpensesQueryDto) {
    const from = this.parseDateOrThrow(query.from);
    const to = this.parseDateOrThrow(query.to);

    if (from && to && from > to) {
      throw new BadRequestException('INVALID_INPUT');
    }

    return this.prisma.expense.findMany({
      where: {
        ...(query.category ? { category: query.category } : {}),
        ...((from || to)
          ? {
              expenseDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        paidBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        expenseDate: 'desc',
      },
    });
  }

  async getRevenueAggregation(query: RevenueQueryDto) {
    const period = query.period ?? 'daily';
    const from = this.parseDateOrThrow(query.from) ?? new Date('1970-01-01T00:00:00.000Z');
    const to = this.parseDateOrThrow(query.to) ?? new Date();

    if (from > to) {
      throw new BadRequestException('INVALID_INPUT');
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const buckets = new Map<string, number>();
    for (const payment of payments) {
      const key = this.formatBucket(payment.createdAt, period);
      const current = buckets.get(key) ?? 0;
      buckets.set(key, this.roundMoney(current + Number(payment.amount)));
    }

    const points = [...buckets.entries()].map(([label, total]) => ({
      label,
      revenue: total,
    }));

    return {
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      totalRevenue: this.roundMoney(points.reduce((acc, item) => acc + item.revenue, 0)),
      points,
    };
  }

  async getMonthlyProfitability(query: AnnualSummaryQueryDto) {
    const year = query.year ?? new Date().getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PAID,
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
      }),
      this.prisma.expense.findMany({
        where: {
          expenseDate: {
            gte: start,
            lt: end,
          },
        },
        select: {
          amount: true,
          category: true,
          expenseDate: true,
        },
      }),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: 0,
      variableExpenses: 0,
      fixedExpenses: 0,
      net: 0,
    }));

    for (const payment of payments) {
      const idx = payment.createdAt.getUTCMonth();
      months[idx].revenue = this.roundMoney(months[idx].revenue + Number(payment.amount));
    }

    for (const expense of expenses) {
      const idx = expense.expenseDate.getUTCMonth();
      if (expense.category === ExpenseCategory.VARIABLE) {
        months[idx].variableExpenses = this.roundMoney(
          months[idx].variableExpenses + Number(expense.amount),
        );
      } else {
        months[idx].fixedExpenses = this.roundMoney(
          months[idx].fixedExpenses + Number(expense.amount),
        );
      }
    }

    for (const month of months) {
      month.net = this.roundMoney(
        month.revenue - month.variableExpenses - month.fixedExpenses,
      );
    }

    return {
      year,
      months,
      totals: {
        revenue: this.roundMoney(months.reduce((acc, m) => acc + m.revenue, 0)),
        variableExpenses: this.roundMoney(
          months.reduce((acc, m) => acc + m.variableExpenses, 0),
        ),
        fixedExpenses: this.roundMoney(months.reduce((acc, m) => acc + m.fixedExpenses, 0)),
        net: this.roundMoney(months.reduce((acc, m) => acc + m.net, 0)),
      },
    };
  }

  async getAnnualSummary(query: AnnualSummaryQueryDto) {
    const monthly = await this.getMonthlyProfitability(query);
    const trend = monthly.months.map((month) => ({
      month: month.month,
      net: month.net,
      revenue: month.revenue,
    }));

    return {
      year: monthly.year,
      totals: monthly.totals,
      trend,
    };
  }
}
