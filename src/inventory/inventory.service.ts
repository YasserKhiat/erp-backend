import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType } from '../common/constants/domain-enums';
import { OrderValidatedEvent } from '../orders/events';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { StockMovementHistoryQueryDto } from './dto/stock-movement-history-query.dto';
import { StockMovementDto } from './dto/stock-movement.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createIngredient(dto: CreateIngredientDto) {
    return this.prisma.ingredient.create({
      data: {
        name: dto.name,
        unit: dto.unit,
        minStockLevel: dto.minStockLevel,
        inventory: {
          create: {
            currentStock: dto.initialStock,
          },
        },
      },
      include: {
        inventory: true,
      },
    });
  }

  async applyMovement(dto: StockMovementDto) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: dto.ingredientId },
      include: { inventory: true },
    });

    if (!ingredient || !ingredient.inventory) {
      throw new NotFoundException('Ingredient inventory not found');
    }

    const signedQty =
      dto.type === StockMovementType.OUT ? -Math.abs(dto.quantity) : dto.quantity;

    const nextStock = Number(ingredient.inventory.currentStock) + signedQty;
    if (nextStock < 0) {
      throw new ConflictException('INSUFFICIENT_STOCK');
    }

    const updatedInventory = await this.prisma.inventory.update({
      where: { ingredientId: dto.ingredientId },
      data: {
        currentStock: nextStock,
      },
    });

    await this.prisma.stockMovement.create({
      data: {
        ingredientId: dto.ingredientId,
        type: dto.type,
        quantity: dto.quantity,
        reason: dto.reason,
      },
    });

    await this.emitLowStockIfNeeded(dto.ingredientId);

    return updatedInventory;
  }

  getInventory() {
    return this.prisma.ingredient.findMany({
      include: { inventory: true },
      orderBy: { name: 'asc' },
    });
  }

  getLowStockItems() {
    return this.prisma.ingredient
      .findMany({ include: { inventory: true } })
      .then((items) =>
        items.filter(
          (item) =>
            item.inventory &&
            Number(item.inventory.currentStock) <= Number(item.minStockLevel),
        ),
      );
  }

  getStockMovementHistory(filters: StockMovementHistoryQueryDto) {
    return this.prisma.stockMovement.findMany({
      where: {
        ...(filters.ingredientId ? { ingredientId: filters.ingredientId } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...((filters.from || filters.to)
          ? {
              createdAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        ingredient: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteIngredient(ingredientId: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
      select: { id: true },
    });

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    const recipeUsageCount = await this.prisma.menuItemIngredient.count({
      where: { ingredientId },
    });

    if (recipeUsageCount > 0) {
      throw new ConflictException('RESOURCE_IN_USE');
    }

    await this.prisma.$transaction([
      this.prisma.stockMovement.deleteMany({ where: { ingredientId } }),
      this.prisma.inventory.deleteMany({ where: { ingredientId } }),
      this.prisma.ingredient.delete({ where: { id: ingredientId } }),
    ]);

    return { deleted: true, ingredientId };
  }

  @OnEvent('order.validated')
  async handleOrderValidated(event: OrderValidatedEvent) {
    for (const orderItem of event.order.items) {
      const recipe = await this.prisma.menuItemIngredient.findMany({
        where: {
          menuItemId: orderItem.menuItemId,
        },
        include: {
          ingredient: {
            include: {
              inventory: true,
            },
          },
        },
      });

      if (recipe.length === 0) {
        throw new ConflictException('MISSING_RECIPE');
      }

      for (const recipeItem of recipe) {
        const consumeQty = Number(recipeItem.quantityNeeded) * orderItem.quantity;

        if (!recipeItem.ingredient.inventory) {
          throw new ConflictException('INSUFFICIENT_STOCK');
        }

        const newStock = Number(recipeItem.ingredient.inventory.currentStock) - consumeQty;

        if (newStock < 0) {
          throw new ConflictException('INSUFFICIENT_STOCK');
        }

        await this.prisma.inventory.update({
          where: { ingredientId: recipeItem.ingredientId },
          data: { currentStock: newStock },
        });

        await this.prisma.stockMovement.create({
          data: {
            ingredientId: recipeItem.ingredientId,
            type: StockMovementType.OUT,
            quantity: consumeQty,
            reason: `Consumption for order ${event.order.id}`,
          },
        });

        await this.emitLowStockIfNeeded(recipeItem.ingredientId);
      }
    }
  }

  private async emitLowStockIfNeeded(ingredientId: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { inventory: true },
    });

    if (!ingredient || !ingredient.inventory) {
      return;
    }

    if (Number(ingredient.inventory.currentStock) <= Number(ingredient.minStockLevel)) {
      // Listener-based alerting keeps inventory decoupled from notification channels.
      this.eventEmitter.emit('stock.low', {
        ingredientId,
      });
    }
  }
}
