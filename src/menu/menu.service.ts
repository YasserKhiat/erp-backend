import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormulaBundleDto } from './dto/create-formula-bundle.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { SetMenuItemRecipeDto } from './dto/set-menu-item-recipe.dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
      },
    });
  }

  private canProduceMenuItem(recipeLines: Array<{ quantityNeeded: Prisma.Decimal; ingredient: { inventory: { currentStock: Prisma.Decimal } | null } }>): boolean {
    if (recipeLines.length === 0) {
      return false;
    }

    return recipeLines.every((line) => {
      const available = Number(line.ingredient.inventory?.currentStock ?? 0);
      return available >= Number(line.quantityNeeded);
    });
  }

  async recalculateMenuItemAvailability(menuItemId: string) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        ingredients: {
          include: {
            ingredient: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    const isAvailable = this.canProduceMenuItem(menuItem.ingredients);

    return this.prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        isAvailable,
      },
    });
  }

  async recalculateAllMenuAvailability() {
    const menuItems = await this.prisma.menuItem.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    const updates = menuItems.map((item) =>
      this.prisma.menuItem.update({
        where: { id: item.id },
        data: {
          isAvailable: this.canProduceMenuItem(item.ingredients),
        },
      }),
    );

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }

    return {
      updated: updates.length,
    };
  }

  createMenuItem(dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        categoryId: dto.categoryId,
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }

  getCategories() {
    return this.prisma.category.findMany({
      include: {
        menuItems: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  getMenu(filters: {
    availableOnly?: boolean;
    categoryId?: string;
    search?: string;
  }) {
    const where: Prisma.MenuItemWhereInput = {
      ...(filters.availableOnly ? { isAvailable: true } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                name: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.menuItem.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getMenuItemById(menuItemId: string) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        category: true,
      },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return menuItem;
  }

  async uploadMenuItemImage(menuItemId: string, file: Express.Multer.File) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    const imageUrl = await this.cloudinaryService.uploadImage(
      file,
      `menu-items/${menuItemId}`,
    );

    return this.prisma.menuItem.update({
      where: { id: menuItemId },
      data: { imageUrl },
      select: {
        imageUrl: true,
      },
    });
  }

  async setMenuItemRecipe(menuItemId: string, dto: SetMenuItemRecipeDto) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    const ingredientIds = dto.ingredients.map((item) => item.ingredientId);
    const uniqueIngredientIds = new Set(ingredientIds);

    if (uniqueIngredientIds.size !== ingredientIds.length) {
      throw new BadRequestException('Recipe contains duplicated ingredients');
    }

    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true },
    });

    if (ingredients.length !== ingredientIds.length) {
      throw new BadRequestException('One or more ingredients are invalid');
    }

    await this.prisma.$transaction([
      this.prisma.menuItemIngredient.deleteMany({ where: { menuItemId } }),
      this.prisma.menuItemIngredient.createMany({
        data: dto.ingredients.map((item) => ({
          menuItemId,
          ingredientId: item.ingredientId,
          quantityNeeded: item.quantityNeeded,
        })),
      }),
    ]);

    await this.recalculateMenuItemAvailability(menuItemId);

    return this.getMenuItemRecipe(menuItemId);
  }

  getMenuItemRecipe(menuItemId: string) {
    return this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: {
              include: {
                inventory: true,
              },
            },
          },
          orderBy: {
            ingredient: {
              name: 'asc',
            },
          },
        },
      },
    });
  }

  async createFormulaBundle(dto: CreateFormulaBundleDto) {
    const menuItemIds = dto.items.map((item) => item.menuItemId);
    const uniqueMenuItemIds = new Set(menuItemIds);

    if (uniqueMenuItemIds.size !== menuItemIds.length) {
      throw new BadRequestException('Formula bundle contains duplicated menu items');
    }

    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException('One or more menu items are invalid');
    }

    return this.prisma.formulaBundle.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        isAvailable: dto.isAvailable ?? true,
        items: {
          create: dto.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });
  }

  getFormulaBundles(availableOnly?: boolean) {
    return this.prisma.formulaBundle.findMany({
      where: availableOnly ? { isAvailable: true } : undefined,
      include: {
        items: {
          include: {
            menuItem: true,
          },
          orderBy: {
            menuItem: {
              name: 'asc',
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getMenuItemMargin(menuItemId: string) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    let estimatedCost = 0;

    const costBreakdown = await Promise.all(
      menuItem.ingredients.map(async (recipeItem) => {
        const latestCost = await this.prisma.supplierOrderItem.findFirst({
          where: {
            ingredientId: recipeItem.ingredientId,
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

        const unitCost = Number(latestCost?.unitCost ?? 0);
        const lineCost = unitCost * Number(recipeItem.quantityNeeded);
        estimatedCost += lineCost;

        return {
          ingredientId: recipeItem.ingredientId,
          ingredientName: recipeItem.ingredient.name,
          quantityNeeded: Number(recipeItem.quantityNeeded),
          unitCost,
          lineCost,
        };
      }),
    );

    const salePrice = Number(menuItem.price);
    const marginAmount = salePrice - estimatedCost;
    const marginPercent = salePrice > 0 ? (marginAmount / salePrice) * 100 : 0;

    return {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      salePrice,
      estimatedCost,
      marginAmount,
      marginPercent,
      costBreakdown,
    };
  }

  async deleteMenuItem(menuItemId: string) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    const activeOrderUsage = await this.prisma.orderItem.count({
      where: {
        menuItemId,
        order: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'BILLED'],
          },
        },
      },
    });

    if (activeOrderUsage > 0) {
      throw new ConflictException('RESOURCE_IN_USE');
    }

    await this.prisma.$transaction([
      this.prisma.menuItemIngredient.deleteMany({ where: { menuItemId } }),
      this.prisma.formulaBundleItem.deleteMany({ where: { menuItemId } }),
      this.prisma.favoriteMenuItem.deleteMany({ where: { menuItemId } }),
      this.prisma.cartItem.deleteMany({ where: { menuItemId } }),
      this.prisma.menuItem.delete({ where: { id: menuItemId } }),
    ]);

    return { deleted: true, menuItemId };
  }
}
