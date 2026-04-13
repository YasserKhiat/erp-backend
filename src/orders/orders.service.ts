import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoyaltyTransactionType,
  OrderStatus,
  OrderType,
  TableStatus,
  UserRole,
} from '../common/constants/domain-enums';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { RemoveOrderItemDto } from './dto/remove-order-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import {
  OrderCancelledEvent,
  OrderConfirmedEvent,
  OrderCompletedEvent,
  OrderCreatedEvent,
} from './events';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly loyaltyRewardCostPoints = 100;
  private readonly loyaltyRewardDiscountAmount = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
  ) {}

  private getTaxRate(): number {
    return Number(this.configService.get('TAX_RATE', '0.1'));
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private getStatusTransitions(status: OrderStatus): OrderStatus[] {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      CONFIRMED: [
        OrderStatus.PREPARING,
        OrderStatus.CANCELLED,
        OrderStatus.OUT_FOR_DELIVERY,
      ],
      PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
      READY: [OrderStatus.SERVED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
      SERVED: [OrderStatus.BILLED, OrderStatus.COMPLETED],
      BILLED: [OrderStatus.COMPLETED],
      OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      DELIVERED: [OrderStatus.COMPLETED],
      COMPLETED: [],
      CANCELLED: [],
    };

    return transitions[status] ?? [];
  }

  private canEditOrderItems(status: OrderStatus): boolean {
    const editableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
    ];

    return editableStatuses.includes(status);
  }

  private async validateCartStockAvailability(
    items: Array<{ menuItemId: string; quantity: number }>,
  ) {
    const menuItemIds = [...new Set(items.map((item) => item.menuItemId))];
    const recipes = await this.prisma.menuItemIngredient.findMany({
      where: { menuItemId: { in: menuItemIds } },
      include: {
        ingredient: {
          include: {
            inventory: true,
          },
        },
      },
    });

    const recipesByMenuItem = new Map<string, typeof recipes>();
    for (const recipe of recipes) {
      const list = recipesByMenuItem.get(recipe.menuItemId) ?? [];
      list.push(recipe);
      recipesByMenuItem.set(recipe.menuItemId, list);
    }

    const requiredByIngredient = new Map<string, number>();

    for (const item of items) {
      const recipeLines = recipesByMenuItem.get(item.menuItemId) ?? [];
      if (recipeLines.length === 0) {
        throw new ConflictException('MISSING_RECIPE');
      }

      for (const line of recipeLines) {
        const needed = Number(line.quantityNeeded) * item.quantity;
        const current = requiredByIngredient.get(line.ingredientId) ?? 0;
        requiredByIngredient.set(line.ingredientId, current + needed);
      }
    }

    for (const [ingredientId, needed] of requiredByIngredient.entries()) {
      const stockLine = recipes.find((line) => line.ingredientId === ingredientId);
      const currentStock = Number(stockLine?.ingredient.inventory?.currentStock ?? 0);

      if (currentStock < needed) {
        throw new ConflictException('INSUFFICIENT_STOCK');
      }
    }
  }

  private async recalculateOrderTotals(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      include: { menuItem: true },
    });

    if (items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const subtotal = this.roundMoney(
      items.reduce(
        (acc, item) => acc + Number(item.menuItem.price) * item.quantity,
        0,
      ),
    );
    const tax = this.roundMoney(subtotal * this.getTaxRate());
    const total = this.roundMoney(subtotal + tax);

    await tx.order.update({
      where: { id: orderId },
      data: { subtotal, tax, total },
    });
  }

  private buildOrderEventPayload(order: {
    id: string;
    orderNumber: number;
    customerId?: string | null;
    orderType: string;
    status: string;
    loyaltyDiscount: Prisma.Decimal;
    total: Prisma.Decimal;
    items: Array<{
      menuItemId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      menuItem?: { name: string };
    }>;
  }): OrderCreatedEvent {
    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId ?? undefined,
        orderType: order.orderType,
        status: order.status,
        loyaltyDiscount: Number(order.loyaltyDiscount),
        total: Number(order.total),
        items: order.items.map((item) => ({
          menuItemId: item.menuItemId,
          menuItemName: item.menuItem?.name ?? 'Unknown item',
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.totalPrice),
          quantity: item.quantity,
        })),
      },
    };
  }

  private buildCartSummary(items: Array<{ quantity: number; menuItem: { price: Prisma.Decimal } }>) {
    const subtotal = this.roundMoney(
      items.reduce((acc, item) => acc + Number(item.menuItem.price) * item.quantity, 0),
    );
    const tax = this.roundMoney(subtotal * this.getTaxRate());
    const total = this.roundMoney(subtotal + tax);

    return {
      subtotal,
      tax,
      total,
    };
  }

  private buildOrderCancelledEventPayload(order: {
    id: string;
    orderNumber: number;
    customerId?: string | null;
  }): OrderCancelledEvent {
    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId ?? undefined,
      },
    };
  }

  private buildOrderCompletedEventPayload(order: {
    id: string;
    total: Prisma.Decimal;
    customerId: string;
    orderNumber: number;
  }): OrderCompletedEvent {
    return {
      order: {
        id: order.id,
        total: Number(order.total),
        customerId: order.customerId,
        orderNumber: order.orderNumber,
      },
    };
  }

  private async getOrCreateActiveCart(userId: string) {
    const active = await this.prisma.cart.findFirst({
      where: { userId, isActive: true },
      include: { items: true },
    });

    if (active) {
      return active;
    }

    return this.prisma.cart.create({
      data: {
        userId,
      },
      include: { items: true },
    });
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateActiveCart(userId);
    const fullCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!fullCart) {
      return null;
    }

    return {
      ...fullCart,
      summary: this.buildCartSummary(fullCart.items),
    };
  }

  async addCartItem(userId: string, dto: AddCartItemDto) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
    });

    if (!menuItem || !menuItem.isAvailable) {
      throw new NotFoundException('Menu item is unavailable');
    }

    const cart = await this.getOrCreateActiveCart(userId);

    await this.prisma.cartItem.upsert({
      where: {
        cartId_menuItemId: {
          cartId: cart.id,
          menuItemId: dto.menuItemId,
        },
      },
      update: {
        quantity: {
          increment: dto.quantity,
        },
      },
      create: {
        cartId: cart.id,
        menuItemId: dto.menuItemId,
        quantity: dto.quantity,
      },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateActiveCart(userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    return this.getCart(userId);
  }

  async updateCartItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateActiveCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeCartItem(userId: string, cartItemId: string) {
    const cart = await this.getOrCreateActiveCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return this.getCart(userId);
  }

  async placeOrder(user: { id: string; role: UserRole }, dto: PlaceOrderDto) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId: user.id, isActive: true },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    if (dto.orderType === OrderType.DINE_IN && !dto.tableId) {
      throw new BadRequestException('Dine-in orders require tableId');
    }

    await this.validateCartStockAvailability(
      cart.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
    );

    if (dto.tableId) {
      const table = await this.prisma.diningTable.findUnique({
        where: { id: dto.tableId },
        select: { id: true, status: true },
      });

      if (!table) {
        throw new NotFoundException('Dining table not found');
      }

      if (
        dto.orderType === OrderType.DINE_IN &&
        table.status === TableStatus.OCCUPIED
      ) {
        throw new BadRequestException('Dining table is already occupied');
      }
    }

    const baseSubtotal = this.roundMoney(
      cart.items.reduce(
        (acc, item) => acc + Number(item.menuItem.price) * item.quantity,
        0,
      ),
    );

    const order = await this.prisma.$transaction(async (tx) => {
      let loyaltyDiscount = 0;
      let loyaltyAutoApplied = false;
      let loyaltyAccountId: string | undefined;

      if (user.role === UserRole.CLIENT && dto.applyLoyaltyAuto !== false) {
        const account = await tx.loyaltyAccount.findUnique({
          where: {
            userId: user.id,
          },
        });

        if (account && account.points >= this.loyaltyRewardCostPoints) {
          loyaltyDiscount = Math.min(this.loyaltyRewardDiscountAmount, baseSubtotal);
          loyaltyAutoApplied = loyaltyDiscount > 0;
          loyaltyAccountId = account.id;
        }
      }

      const subtotal = baseSubtotal;
      const taxable = Math.max(0, this.roundMoney(subtotal - loyaltyDiscount));
      const tax = this.roundMoney(taxable * this.getTaxRate());
      const total = this.roundMoney(taxable + tax);

      const created = await tx.order.create({
        data: {
          customerId: user.role === UserRole.CLIENT ? user.id : undefined,
          employeeId: user.role !== UserRole.CLIENT ? user.id : undefined,
          status: OrderStatus.CONFIRMED,
          orderType: dto.orderType,
          tableNumber: dto.tableNumber,
          tableId: dto.tableId,
          notes: dto.notes,
          subtotal,
          loyaltyDiscount,
          loyaltyAutoApplied,
          tax,
          total,
          items: {
            create: cart.items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: item.menuItem.price,
              totalPrice: this.roundMoney(
                Number(item.menuItem.price) * item.quantity,
              ),
            })),
          },
        },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (loyaltyAutoApplied && loyaltyAccountId) {
        const updated = await tx.loyaltyAccount.update({
          where: { id: loyaltyAccountId },
          data: {
            points: {
              decrement: this.loyaltyRewardCostPoints,
            },
          },
        });

        await tx.loyaltyTransaction.create({
          data: {
            accountId: loyaltyAccountId,
            userId: user.id,
            orderId: created.id,
            type: LoyaltyTransactionType.REDEEM_REWARD,
            pointsDelta: -this.loyaltyRewardCostPoints,
            balanceAfter: updated.points,
            reason: `Automatic checkout reward for order #${created.orderNumber}`,
            referenceKey: `auto-redeem:${created.id}`,
          },
        });
      }

      if (dto.orderType === OrderType.DINE_IN && dto.tableId) {
        await tx.diningTable.update({
          where: { id: dto.tableId },
          data: { status: TableStatus.OCCUPIED },
        });
      }

      await tx.cart.update({
        where: { id: cart.id },
        data: { isActive: false },
      });

      return created;
    });

    const createdEvent = this.buildOrderEventPayload(order) as OrderCreatedEvent;
    this.logger.log(`Emitting order.created for order ${order.id}`);
    this.eventEmitter.emit('order.created', createdEvent);

    const confirmedEvent = createdEvent as OrderConfirmedEvent;
    this.logger.log(`Emitting order.confirmed for order ${order.id}`);
    this.eventEmitter.emit('order.confirmed', confirmedEvent);

    this.auditLogService.log({
      userId: user.id,
      action: 'order.created',
      entity: 'order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        status: order.status,
        total: Number(order.total),
      },
    });

    return order;
  }

  getOrderHistory(userId: string) {
    return this.prisma.order.findMany({
      where: { customerId: userId },
      include: {
        items: { include: { menuItem: true } },
        payments: true,
        table: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listBackofficeOrders(query: OrdersQueryDto) {
    const { page = 1, limit = 10, status, orderType, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (status) {
      where.status = status;
    }
    if (orderType) {
      where.orderType = orderType;
    }

    if (search) {
      const searchNum = parseInt(search, 10);
      where.OR = [
        ...(isNaN(searchNum) ? [] : [{ orderNumber: searchNum }]),
        {
          customer: {
            OR: [
              { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
              { fullName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            ],
          },
        },
      ];
      // Since order ID is string UUID, we can also search if it matches a UUID format, but typically string contains works
      where.OR.push({ id: { contains: search, mode: 'insensitive' as Prisma.QueryMode } });
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, email: true, fullName: true },
          },
          table: {
            select: { id: true, code: true },
          },
          items: {
            include: { menuItem: true }
          }
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async getOrder(orderId: string, user?: { id: string; role: UserRole }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        payments: true,
        table: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (user?.role === UserRole.CLIENT && order.customerId !== user.id) {
      throw new ForbiddenException();
    }

    return order;
  }

  async trackOrder(orderId: string, user: { id: string; role: UserRole }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (user.role === UserRole.CLIENT && order.customerId !== user.id) {
      throw new ForbiddenException();
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      estimatedTotal: Number(order.total),
      table: order.table
        ? {
            id: order.table.id,
            code: order.table.code,
          }
        : null,
      latestPaymentStatus: order.payments[0]?.status ?? null,
    };
  }

  private async getOrderForInvoice(orderId: string, user: { id: string; role: UserRole }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
        payments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        table: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const canAccessAll = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    const isOwnOrder = user.role === UserRole.CLIENT && order.customerId === user.id;

    if (!canAccessAll && !isOwnOrder) {
      throw new ForbiddenException();
    }

    return order;
  }

  async getOrderInvoice(orderId: string, user: { id: string; role: UserRole }) {
    const order = await this.getOrderForInvoice(orderId, user);
    const paidTotal = this.roundMoney(
      order.payments
        .filter((payment) => payment.status === 'PAID')
        .reduce((acc, payment) => acc + Number(payment.amount), 0),
    );

    return {
      invoiceNumber: order.billNumber ?? `BILL-${order.orderNumber}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      orderStatus: order.status,
      issuedAt: order.billedAt ?? order.updatedAt,
      customer: order.customer
        ? {
            id: order.customer.id,
            fullName: order.customer.fullName,
            email: order.customer.email,
          }
        : null,
      table: order.table
        ? {
            id: order.table.id,
            code: order.table.code,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.totalPrice),
      })),
      totals: {
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        loyaltyDiscount: Number(order.loyaltyDiscount),
        total: Number(order.total),
        paidTotal,
        remaining: Math.max(0, this.roundMoney(Number(order.total) - paidTotal)),
      },
      payments: order.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        status: payment.status,
        transactionRef: payment.transactionRef,
        createdAt: payment.createdAt,
      })),
    };
  }

  async getOrderInvoicePdf(orderId: string, user: { id: string; role: UserRole }): Promise<Buffer> {
    const invoice = await this.getOrderInvoice(orderId, user);
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fontSize(20).text('Invoice', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Invoice #: ${invoice.invoiceNumber}`);
      doc.text(`Order #: ${invoice.orderNumber}`);
      doc.text(`Issued at: ${new Date(invoice.issuedAt).toLocaleString()}`);
      doc.text(`Order type: ${invoice.orderType}`);
      doc.text(`Order status: ${invoice.orderStatus}`);
      doc.moveDown(0.5);

      if (invoice.customer) {
        doc.fontSize(12).text('Customer', { underline: true });
        doc.fontSize(11).text(invoice.customer.fullName);
        doc.text(invoice.customer.email);
      } else {
        doc.fontSize(12).text('Customer', { underline: true });
        doc.fontSize(11).text('Walk-in / not linked');
      }

      if (invoice.table) {
        doc.text(`Table: ${invoice.table.code}`);
      }

      doc.moveDown(1);
      doc.fontSize(12).text('Items', { underline: true });
      doc.moveDown(0.4);

      for (const item of invoice.items) {
        doc
          .fontSize(10)
          .text(
            `${item.menuItemName}  x${item.quantity}  @ ${item.unitPrice.toFixed(2)}  = ${item.lineTotal.toFixed(2)}`,
          );
      }

      doc.moveDown(1);
      doc.fontSize(12).text('Totals', { underline: true });
      doc.fontSize(10).text(`Subtotal: ${invoice.totals.subtotal.toFixed(2)}`);
      doc.text(`Tax: ${invoice.totals.tax.toFixed(2)}`);
      doc.text(`Loyalty discount: ${invoice.totals.loyaltyDiscount.toFixed(2)}`);
      doc.text(`Total: ${invoice.totals.total.toFixed(2)}`);
      doc.text(`Paid: ${invoice.totals.paidTotal.toFixed(2)}`);
      doc.text(`Remaining: ${invoice.totals.remaining.toFixed(2)}`);

      doc.moveDown(1);
      doc.fontSize(12).text('Payments', { underline: true });
      doc.moveDown(0.3);
      if (invoice.payments.length === 0) {
        doc.fontSize(10).text('No payments registered yet.');
      } else {
        for (const payment of invoice.payments) {
          doc
            .fontSize(10)
            .text(
              `${new Date(payment.createdAt).toLocaleString()}  ${payment.method}  ${payment.status}  ${payment.amount.toFixed(2)}${
                payment.transactionRef ? `  ref: ${payment.transactionRef}` : ''
              }`,
            );
        }
      }

      doc.end();
    });
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto, actorId?: string) {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const nextStatuses = this.getStatusTransitions(existing.status as OrderStatus);
    if (!nextStatuses.includes(dto.status)) {
      throw new ConflictException('INVALID_ORDER_STATUS');
    }

    const updateData: Prisma.OrderUpdateInput = {
      status: dto.status,
    };

    if (dto.status === OrderStatus.BILLED) {
      updateData.billNumber = existing.billNumber ?? `BILL-${existing.orderNumber}`;
      updateData.billedAt = new Date();
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: { items: true },
      });

      const releaseTableStatuses: OrderStatus[] = [
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ];

      if (order.tableId && releaseTableStatuses.includes(dto.status)) {
        await tx.diningTable.update({
          where: { id: order.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }

      return order;
    });

    this.auditLogService.log({
      userId: actorId ?? null,
      action: 'order.status.updated',
      entity: 'order',
      entityId: updated.id,
      metadata: {
        orderNumber: updated.orderNumber,
        previousStatus: existing.status,
        nextStatus: dto.status,
      },
    });

    if (dto.status === OrderStatus.COMPLETED && updated.customerId) {
      this.logger.log(`Emitting order.completed for order ${updated.id}`);
      this.eventEmitter.emit(
        'order.completed',
        this.buildOrderCompletedEventPayload({
          id: updated.id,
          total: updated.total,
          customerId: updated.customerId,
          orderNumber: updated.orderNumber,
        }) as OrderCompletedEvent,
      );
    }

    if (dto.status === OrderStatus.CANCELLED) {
      this.logger.log(`Emitting order.cancelled for order ${updated.id}`);
      this.eventEmitter.emit(
        'order.cancelled',
        this.buildOrderCancelledEventPayload({
          id: updated.id,
          orderNumber: updated.orderNumber,
          customerId: updated.customerId,
        }) as OrderCancelledEvent,
      );
    }

    return updated;
  }

  async updateOrderItem(
    orderId: string,
    orderItemId: string,
    dto: UpdateOrderItemDto,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!this.canEditOrderItems(order.status as OrderStatus)) {
      throw new ConflictException('INVALID_ORDER_STATUS');
    }

    await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({
        where: { id: orderItemId, orderId },
      });

      if (!item) {
        throw new NotFoundException('Order item not found');
      }

      const menuItem = await tx.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found');
      }

      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          quantity: dto.quantity,
          totalPrice: this.roundMoney(Number(menuItem.price) * dto.quantity),
        },
      });

      await this.recalculateOrderTotals(tx, orderId);
    });

    return this.getOrder(orderId);
  }

  async removeOrderItem(
    orderId: string,
    orderItemId: string,
    dto: RemoveOrderItemDto,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!this.canEditOrderItems(order.status as OrderStatus)) {
      throw new ConflictException('INVALID_ORDER_STATUS');
    }

    await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({
        where: { id: orderItemId, orderId },
      });

      if (!item) {
        throw new NotFoundException('Order item not found');
      }

      if (dto.removeAll || item.quantity <= 1) {
        await tx.orderItem.delete({ where: { id: orderItemId } });
      } else {
        const nextQty = item.quantity - 1;
        await tx.orderItem.update({
          where: { id: orderItemId },
          data: {
            quantity: nextQty,
            totalPrice: this.roundMoney(Number(item.unitPrice) * nextQty),
          },
        });
      }

      await this.recalculateOrderTotals(tx, orderId);
    });

    return this.getOrder(orderId);
  }
}
