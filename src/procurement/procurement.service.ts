import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  StockMovementType,
  SupplierOrderStatus,
} from '../common/constants/domain-enums';
import { MenuService } from '../menu/menu.service';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { CreateSupplierCatalogItemDto } from './dto/create-supplier-catalog-item.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListProcurementCatalogQueryDto } from './dto/list-procurement-catalog-query.dto';
import { UpdateSupplierOrderStatusDto } from './dto/update-supplier-order-status.dto';
import { UpdateSupplierCatalogItemDto } from './dto/update-supplier-catalog-item.dto';

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly menuService: MenuService,
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

    const catalogIds = dto.items
      .map((item) => item.supplierCatalogItemId)
      .filter((id): id is string => Boolean(id));

    const catalogItems = catalogIds.length
      ? await this.prisma.supplierCatalogItem.findMany({
          where: {
            id: {
              in: catalogIds,
            },
            supplierId: dto.supplierId,
            isActive: true,
          },
        })
      : [];

    const catalogMap = new Map(catalogItems.map((item) => [item.id, item]));

    const resolvedItems = dto.items.map((item) => {
      const catalog = item.supplierCatalogItemId
        ? catalogMap.get(item.supplierCatalogItemId)
        : undefined;

      const resolvedUnitCost =
        item.unitCost !== undefined ? item.unitCost : Number(catalog?.unitPrice ?? 0);

      if (resolvedUnitCost <= 0) {
        throw new BadRequestException('INVALID_INPUT');
      }

      if (catalog && catalog.ingredientId !== item.ingredientId) {
        throw new BadRequestException('INVALID_INPUT');
      }

      return {
        ingredientId: item.ingredientId,
        supplierCatalogItemId: item.supplierCatalogItemId,
        quantity: item.quantity,
        unitCost: resolvedUnitCost,
        lineTotal: item.quantity * resolvedUnitCost,
      };
    });

    const totalAmount = resolvedItems.reduce((acc, item) => acc + item.lineTotal, 0);

    return this.prisma.supplierOrder.create({
      data: {
        supplierId: dto.supplierId,
        notes: dto.notes,
        status: SupplierOrderStatus.DRAFT,
        totalAmount,
        items: {
          create: resolvedItems,
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
            supplierCatalogItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listSupplierCatalogBySupplier(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return this.prisma.supplierCatalogItem.findMany({
      where: {
        supplierId,
      },
      include: {
        ingredient: true,
      },
      orderBy: {
        ingredient: {
          name: 'asc',
        },
      },
    });
  }

  async createSupplierCatalogItem(
    supplierId: string,
    dto: CreateSupplierCatalogItemDto,
  ) {
    const [supplier, ingredient] = await Promise.all([
      this.prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true },
      }),
      this.prisma.ingredient.findUnique({
        where: { id: dto.ingredientId },
        select: { id: true },
      }),
    ]);

    if (!supplier || !ingredient) {
      throw new BadRequestException('INVALID_INPUT');
    }

    return this.prisma.supplierCatalogItem.create({
      data: {
        supplierId,
        ingredientId: dto.ingredientId,
        supplierSku: dto.supplierSku,
        unit: dto.unit,
        leadTimeDays: dto.leadTimeDays,
        unitPrice: dto.unitPrice,
        isActive: dto.isActive ?? true,
      },
      include: {
        ingredient: true,
      },
    });
  }

  async updateSupplierCatalogItem(
    supplierId: string,
    catalogItemId: string,
    dto: UpdateSupplierCatalogItemDto,
  ) {
    const item = await this.prisma.supplierCatalogItem.findFirst({
      where: {
        id: catalogItemId,
        supplierId,
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Catalog item not found');
    }

    if (dto.ingredientId) {
      const ingredient = await this.prisma.ingredient.findUnique({
        where: { id: dto.ingredientId },
        select: { id: true },
      });
      if (!ingredient) {
        throw new BadRequestException('INVALID_INPUT');
      }
    }

    return this.prisma.supplierCatalogItem.update({
      where: {
        id: catalogItemId,
      },
      data: {
        ...(dto.ingredientId !== undefined ? { ingredientId: dto.ingredientId } : {}),
        ...(dto.supplierSku !== undefined ? { supplierSku: dto.supplierSku } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.leadTimeDays !== undefined ? { leadTimeDays: dto.leadTimeDays } : {}),
        ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        ingredient: true,
      },
    });
  }

  async listProcurementCatalog(query: ListProcurementCatalogQueryDto) {
    return this.prisma.supplierCatalogItem.findMany({
      where: {
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        ...(query.ingredientId ? { ingredientId: query.ingredientId } : {}),
        ...(query.activeOnly ? { isActive: true } : {}),
      },
      include: {
        supplier: true,
        ingredient: true,
      },
      orderBy: [{ supplier: { name: 'asc' } }, { ingredient: { name: 'asc' } }],
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
      throw new ConflictException('INVALID_ORDER_STATUS');
    }

    if (order.status === SupplierOrderStatus.CANCELLED) {
      throw new ConflictException('INVALID_ORDER_STATUS');
    }

    if (order.status === SupplierOrderStatus.DRAFT && dto.status === SupplierOrderStatus.RECEIVED) {
      throw new ConflictException('INVALID_ORDER_STATUS');
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
      throw new ConflictException('INVALID_ORDER_STATUS');
    }

    if (order.status === SupplierOrderStatus.RECEIVED) {
      throw new ConflictException('INVALID_ORDER_STATUS');
    }

    if (order.status !== SupplierOrderStatus.SUBMITTED) {
      throw new ConflictException('INVALID_ORDER_STATUS');
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

    await this.menuService.recalculateAllMenuAvailability();

    return this.prisma.supplierOrder.findUnique({
      where: { id: supplierOrderId },
      include: {
        supplier: true,
        items: {
          include: {
            ingredient: true,
            supplierCatalogItem: true,
          },
        },
      },
    });
  }
}
