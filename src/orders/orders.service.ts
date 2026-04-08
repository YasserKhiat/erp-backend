import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrderStatus,
  OrderType,
  TableStatus,
  UserRole,
} from '../common/constants/domain-enums';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { RemoveOrderItemDto } from './dto/remove-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderCreatedEvent, OrderValidatedEvent } from './events';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
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
      OrderStatus.PREPARING,
      OrderStatus.READY,
    ];

    return editableStatuses.includes(status);
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
    total: Prisma.Decimal;
    items: Array<{ menuItemId: string; quantity: number }>;
  }): OrderCreatedEvent {
    return {
      order: {
        id: order.id,
        total: Number(order.total),
        items: order.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
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
    return this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });
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

    const subtotal = this.roundMoney(
      cart.items.reduce(
        (acc, item) => acc + Number(item.menuItem.price) * item.quantity,
        0,
      ),
    );
    const tax = this.roundMoney(subtotal * this.getTaxRate());
    const total = this.roundMoney(subtotal + tax);

    const order = await this.prisma.$transaction(async (tx) => {
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
          items: true,
        },
      });

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

    this.eventEmitter.emit(
      'order.created',
      this.buildOrderEventPayload(order) as OrderCreatedEvent,
    );

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

  async getOrder(orderId: string) {
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

    return order;
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const nextStatuses = this.getStatusTransitions(existing.status as OrderStatus);
    if (!nextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${existing.status} to ${dto.status}`,
      );
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

    if (dto.status === OrderStatus.PREPARING) {
      this.eventEmitter.emit(
        'order.validated',
        this.buildOrderEventPayload(updated) as OrderValidatedEvent,
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
      throw new BadRequestException('Order items cannot be modified at this status');
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
      throw new BadRequestException('Order items cannot be modified at this status');
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
