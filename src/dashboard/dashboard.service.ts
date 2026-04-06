import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { OrderCreatedEvent } from '../orders/events';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const orderTotal = Number(event.order.total);

    await this.prisma.dailyStat.upsert({
      where: { date: day },
      update: {
        totalOrders: {
          increment: 1,
        },
        totalRevenue: {
          increment: orderTotal,
        },
      },
      create: {
        date: day,
        totalOrders: 1,
        totalRevenue: orderTotal,
      },
    });
  }

  async getOverview() {
    const [payments, orders, topItems, lowStock] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
      }),
      this.prisma.order.count(),
      this.prisma.orderItem.groupBy({
        by: ['menuItemId'],
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
      soldQuantity: item._sum.quantity ?? 0,
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

    return {
      revenue: Number(payments._sum.amount ?? 0),
      numberOfOrders: orders,
      bestSellingItems: mappedTopItems,
      stockAlerts: lowStockAlerts,
    };
  }
}
