import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType } from '../common/constants/domain-enums';
import { OrderValidatedEvent } from '../orders/events';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
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

    const updatedInventory = await this.prisma.inventory.update({
      where: { ingredientId: dto.ingredientId },
      data: {
        currentStock: Number(ingredient.inventory.currentStock) + signedQty,
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

      for (const recipeItem of recipe) {
        const consumeQty = Number(recipeItem.quantityNeeded) * orderItem.quantity;

        if (!recipeItem.ingredient.inventory) {
          continue;
        }

        const newStock = Number(recipeItem.ingredient.inventory.currentStock) - consumeQty;

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
