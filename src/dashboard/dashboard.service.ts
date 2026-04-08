import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '../common/constants/domain-enums';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private parseDate(value?: string) {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }

    return parsed;
  }

  async getOverview(query: DashboardQueryDto = {}) {
    const from = this.parseDate(query.from);
    const to = this.parseDate(query.to);

    const orderFilters: Prisma.OrderWhereInput = {
      ...(query.orderType ? { orderType: query.orderType } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      status: {
        not: OrderStatus.CANCELLED,
      },
    };

    const paymentOrderFilter: Prisma.OrderWhereInput = {
      ...(query.orderType ? { orderType: query.orderType } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    };

    const [payments, orders, topItems, lowStock, expenses] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          ...(from || to
            ? {
                createdAt: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
          ...(query.orderType || query.employeeId
            ? {
                order: {
                  is: paymentOrderFilter,
                },
              }
            : {}),
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.order.count({
        where: orderFilters,
      }),
      this.prisma.orderItem.groupBy({
        by: ['menuItemId'],
        where: {
          order: {
            ...orderFilters,
          },
          ...(query.categoryId
            ? {
                menuItem: {
                  categoryId: query.categoryId,
                },
              }
            : {}),
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 5,
      }),
      this.prisma.ingredient.findMany({
        include: {
          inventory: true,
        },
      }),
      this.prisma.expense.aggregate({
        where: {
          ...(from || to
            ? {
                expenseDate: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const topItemIds = topItems.map((item) => item.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        id: {
          in: topItemIds,
        },
      },
    });

    const mappedTopItems = topItems.map((item) => ({
      menuItemId: item.menuItemId,
      name: menuItems.find((m) => m.id === item.menuItemId)?.name ?? 'Unknown',
      soldQuantity: item._sum?.quantity ?? 0,
    }));

    const lowStockAlerts = lowStock
      .filter(
        (item) =>
          item.inventory &&
          Number(item.inventory.currentStock) <= Number(item.minStockLevel),
      )
      .map((item) => ({
        ingredientId: item.id,
        name: item.name,
        currentStock: item.inventory ? Number(item.inventory.currentStock) : 0,
        minStockLevel: Number(item.minStockLevel),
      }));

    const revenue = Number(payments._sum?.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    return {
      filters: {
        period: query.period ?? 'daily',
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
        categoryId: query.categoryId ?? null,
        orderType: query.orderType ?? null,
        employeeId: query.employeeId ?? null,
      },
      revenue: this.roundMoney(revenue),
      numberOfOrders: orders,
      bestSellingItems: mappedTopItems,
      stockAlerts: lowStockAlerts,
      monthlyProfitEstimate: this.roundMoney(revenue - totalExpenses),
    };
  }

  async getReportData(query: DashboardQueryDto = {}) {
    const overview = await this.getOverview(query);
    const generatedAt = new Date().toISOString();

    return {
      generatedAt,
      metadata: {
        reportType: 'analytics-summary',
        exportReady: true,
        filters: overview.filters,
      },
      sections: {
        kpis: {
          revenue: overview.revenue,
          orderCount: overview.numberOfOrders,
          monthlyProfitEstimate: overview.monthlyProfitEstimate,
        },
        bestSellers: overview.bestSellingItems,
        criticalStockItems: overview.stockAlerts,
      },
    };
  }
}
