import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, UserRole } from '../common/constants/domain-enums';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderCreatedEvent } from './events';

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
          orderType: dto.orderType,
          tableNumber: dto.tableNumber,
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

      await tx.cart.update({
        where: { id: cart.id },
        data: { isActive: false },
      });

      return created;
    });

    this.eventEmitter.emit('order.created', {
      order: {
        id: order.id,
        total: Number(order.total),
        items: order.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      },
    } as OrderCreatedEvent);

    return order;
  }

  getOrderHistory(userId: string) {
    return this.prisma.order.findMany({
      where: { customerId: userId },
      include: { items: { include: { menuItem: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: true } }, payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const existing = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    if (existing.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cancelled orders cannot be updated');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: dto.status },
    });
  }
}
