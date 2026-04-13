import { Injectable } from '@nestjs/common';
import ExcelJS = require('exceljs');
import PDFDocument = require('pdfkit');
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

    const [payments, orders, topItems, lowStock, expenses, tables, paidPayments] = await Promise.all([
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
      this.prisma.diningTable.findMany({
        select: {
          id: true,
          status: true,
        },
      }),
      this.prisma.payment.findMany({
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
        },
        select: {
          amount: true,
          order: {
            select: {
              employeeId: true,
              items: {
                select: {
                  menuItemId: true,
                  quantity: true,
                  totalPrice: true,
                },
              },
            },
          },
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
    const averageTicket = orders > 0 ? this.roundMoney(revenue / orders) : 0;
    const occupiedTables = tables.filter(
      (table) => table.status === 'OCCUPIED' || table.status === 'RESERVED',
    ).length;
    const occupancyRate =
      tables.length > 0 ? this.roundMoney((occupiedTables / tables.length) * 100) : 0;

    const menuItemCostMap = new Map<string, number>();
    const menuItemsWithRecipes = await this.prisma.menuItem.findMany({
      select: {
        id: true,
        name: true,
        ingredients: {
          select: {
            ingredientId: true,
            quantityNeeded: true,
          },
        },
      },
    });

    for (const menuItem of menuItemsWithRecipes) {
      let unitCost = 0;
      for (const recipe of menuItem.ingredients) {
        const latestCost = await this.prisma.supplierOrderItem.findFirst({
          where: {
            ingredientId: recipe.ingredientId,
            supplierOrder: {
              status: 'RECEIVED',
            },
          },
          orderBy: {
            supplierOrder: {
              receivedAt: 'desc',
            },
          },
          select: {
            unitCost: true,
          },
        });
        unitCost += Number(latestCost?.unitCost ?? 0) * Number(recipe.quantityNeeded);
      }
      menuItemCostMap.set(menuItem.id, this.roundMoney(unitCost));
    }

    const profitabilityByDish = new Map<
      string,
      { menuItemId: string; name: string; revenue: number; estimatedCost: number; profit: number }
    >();

    const profitabilityByServer = new Map<
      string,
      { employeeId: string; employeeName: string; revenue: number; orderCount: number; profit: number }
    >();

    const employeeIds = [...new Set(paidPayments.map((item) => item.order.employeeId).filter(Boolean))] as string[];
    const employees = await this.prisma.user.findMany({
      where: {
        id: {
          in: employeeIds,
        },
      },
      select: {
        id: true,
        fullName: true,
      },
    });

    const employeeNameMap = new Map(employees.map((employee) => [employee.id, employee.fullName]));

    for (const payment of paidPayments) {
      const employeeId = payment.order.employeeId;
      let paymentCost = 0;

      for (const item of payment.order.items) {
        const unitCost = menuItemCostMap.get(item.menuItemId) ?? 0;
        const cost = this.roundMoney(unitCost * item.quantity);
        paymentCost += cost;

        const entry = profitabilityByDish.get(item.menuItemId) ?? {
          menuItemId: item.menuItemId,
          name: menuItems.find((menuItem) => menuItem.id === item.menuItemId)?.name ?? 'Unknown',
          revenue: 0,
          estimatedCost: 0,
          profit: 0,
        };

        entry.revenue = this.roundMoney(entry.revenue + Number(item.totalPrice));
        entry.estimatedCost = this.roundMoney(entry.estimatedCost + cost);
        entry.profit = this.roundMoney(entry.revenue - entry.estimatedCost);
        profitabilityByDish.set(item.menuItemId, entry);
      }

      if (employeeId) {
        const server = profitabilityByServer.get(employeeId) ?? {
          employeeId,
          employeeName: employeeNameMap.get(employeeId) ?? 'Unknown',
          revenue: 0,
          orderCount: 0,
          profit: 0,
        };

        server.revenue = this.roundMoney(server.revenue + Number(payment.amount));
        server.orderCount += 1;
        server.profit = this.roundMoney(server.profit + Number(payment.amount) - paymentCost);
        profitabilityByServer.set(employeeId, server);
      }
    }

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
      averageTicket,
      tableOccupancyRate: occupancyRate,
      profitabilityByDish: [...profitabilityByDish.values()]
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10),
      profitabilityByServer: [...profitabilityByServer.values()]
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10),
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
          averageTicket: overview.averageTicket,
          tableOccupancyRate: overview.tableOccupancyRate,
        },
        bestSellers: overview.bestSellingItems,
        criticalStockItems: overview.stockAlerts,
        profitabilityByDish: overview.profitabilityByDish,
        profitabilityByServer: overview.profitabilityByServer,
      },
    };
  }

  async exportReportPdf(query: DashboardQueryDto = {}): Promise<Buffer> {
    const report = await this.getReportData(query);
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk as Buffer));

    doc.fontSize(18).text('Restaurant ERP Dashboard Report', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Generated at: ${report.generatedAt}`);
    doc.moveDown();
    doc.fontSize(13).text('KPIs');
    doc.fontSize(11).text(`Revenue: ${report.sections.kpis.revenue}`);
    doc.fontSize(11).text(`Order Count: ${report.sections.kpis.orderCount}`);
    doc.fontSize(11).text(
      `Monthly Profit Estimate: ${report.sections.kpis.monthlyProfitEstimate}`,
    );
    doc.fontSize(11).text(`Average Ticket: ${report.sections.kpis.averageTicket}`);
    doc.fontSize(11).text(
      `Table Occupancy Rate: ${report.sections.kpis.tableOccupancyRate}%`,
    );

    doc.moveDown();
    doc.fontSize(13).text('Best Sellers');
    for (const item of report.sections.bestSellers) {
      doc.fontSize(10).text(`- ${item.name}: ${item.soldQuantity}`);
    }

    doc.moveDown();
    doc.fontSize(13).text('Profitability by Dish');
    for (const row of report.sections.profitabilityByDish.slice(0, 10)) {
      doc
        .fontSize(10)
        .text(`- ${row.name}: revenue=${row.revenue}, cost=${row.estimatedCost}, profit=${row.profit}`);
    }

    doc.moveDown();
    doc.fontSize(13).text('Profitability by Server');
    for (const row of report.sections.profitabilityByServer.slice(0, 10)) {
      doc
        .fontSize(10)
        .text(`- ${row.employeeName}: revenue=${row.revenue}, orders=${row.orderCount}, profit=${row.profit}`);
    }

    doc.end();

    return await new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(error));
    });
  }

  async exportReportExcel(query: DashboardQueryDto = {}): Promise<Buffer> {
    const report = await this.getReportData(query);
    const workbook = new ExcelJS.Workbook();

    const kpiSheet = workbook.addWorksheet('KPIs');
    kpiSheet.addRow(['Metric', 'Value']);
    kpiSheet.addRow(['Revenue', report.sections.kpis.revenue]);
    kpiSheet.addRow(['Order Count', report.sections.kpis.orderCount]);
    kpiSheet.addRow(['Monthly Profit Estimate', report.sections.kpis.monthlyProfitEstimate]);
    kpiSheet.addRow(['Average Ticket', report.sections.kpis.averageTicket]);
    kpiSheet.addRow(['Table Occupancy Rate', report.sections.kpis.tableOccupancyRate]);

    const bestSellerSheet = workbook.addWorksheet('Best Sellers');
    bestSellerSheet.addRow(['Menu Item', 'Sold Quantity']);
    for (const item of report.sections.bestSellers) {
      bestSellerSheet.addRow([item.name, item.soldQuantity]);
    }

    const stockSheet = workbook.addWorksheet('Critical Stock');
    stockSheet.addRow(['Ingredient', 'Current Stock', 'Min Stock']);
    for (const item of report.sections.criticalStockItems) {
      stockSheet.addRow([item.name, item.currentStock, item.minStockLevel]);
    }

    const dishProfitSheet = workbook.addWorksheet('Profit by Dish');
    dishProfitSheet.addRow(['Dish', 'Revenue', 'Estimated Cost', 'Profit']);
    for (const row of report.sections.profitabilityByDish) {
      dishProfitSheet.addRow([row.name, row.revenue, row.estimatedCost, row.profit]);
    }

    const serverProfitSheet = workbook.addWorksheet('Profit by Server');
    serverProfitSheet.addRow(['Server', 'Revenue', 'Order Count', 'Profit']);
    for (const row of report.sections.profitabilityByServer) {
      serverProfitSheet.addRow([
        row.employeeName,
        row.revenue,
        row.orderCount,
        row.profit,
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
