import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  StockMovementType,
  SupplierOrderStatus,
} from '../common/constants/domain-enums';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierOrderStatusDto } from './dto/update-supplier-order-status.dto';

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  createSupplier(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      },
    });
  }

  listSuppliers() {
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplierOrder(dto: CreateSupplierOrderDto) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });

    if (!supplier || !supplier.isActive) {
      throw new NotFoundException('Supplier not found');
    }

    const ingredientIds = dto.items.map((item) => item.ingredientId);
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true },
    });

    if (ingredients.length !== ingredientIds.length) {
      throw new BadRequestException('One or more ingredients are invalid');
    }

    const totalAmount = dto.items.reduce(
      (acc, item) => acc + item.quantity * item.unitCost,
      0,
    );

    return this.prisma.supplierOrder.create({
      data: {
        supplierId: dto.supplierId,
        notes: dto.notes,
        status: SupplierOrderStatus.DRAFT,
        totalAmount,
        items: {
          create: dto.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            lineTotal: item.quantity * item.unitCost,
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });
  }

  listSupplierOrders() {
    return this.prisma.supplierOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSupplierOrderStatus(
    supplierOrderId: string,
    dto: UpdateSupplierOrderStatusDto,
  ) {
    const order = await this.prisma.supplierOrder.findUnique({
      where: { id: supplierOrderId },
    });

    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    if (order.status === SupplierOrderStatus.RECEIVED) {
      throw new BadRequestException('Received supplier orders cannot be modified');
    }

    if (order.status === SupplierOrderStatus.CANCELLED) {
      throw new BadRequestException('Cancelled supplier orders cannot be modified');
    }

    return this.prisma.supplierOrder.update({
      where: { id: supplierOrderId },
      data: { status: dto.status },
    });
  }

  async receiveSupplierOrder(supplierOrderId: string) {
    const order = await this.prisma.supplierOrder.findUnique({
      where: { id: supplierOrderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    if (order.status === SupplierOrderStatus.CANCELLED) {
      throw new BadRequestException('Cancelled supplier orders cannot be received');
    }

    if (order.status === SupplierOrderStatus.RECEIVED) {
      throw new BadRequestException('Supplier order already received');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const inventory = await tx.inventory.findUnique({
          where: { ingredientId: item.ingredientId },
        });

        if (!inventory) {
          throw new NotFoundException(
            `Inventory not found for ingredient ${item.ingredientId}`,
          );
        }

        await tx.inventory.update({
          where: { ingredientId: item.ingredientId },
          data: {
            currentStock:
              Number(inventory.currentStock) + Number(item.quantity),
          },
        });

        await tx.stockMovement.create({
          data: {
            ingredientId: item.ingredientId,
            type: StockMovementType.IN,
            quantity: item.quantity,
            reason: `Supplier order receipt ${order.id}`,
          },
        });
      }

      await tx.supplierOrder.update({
        where: { id: supplierOrderId },
        data: {
          status: SupplierOrderStatus.RECEIVED,
          receivedAt: new Date(),
        },
      });
    });

    this.eventEmitter.emit('procurement.order.received', {
      supplierOrderId,
    });

    return this.prisma.supplierOrder.findUnique({
      where: { id: supplierOrderId },
      include: {
        supplier: true,
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });
  }
}
