import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuAvailabilityDto } from './dto/update-menu-availability.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
      },
    });
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
    const where = {
      ...(filters.availableOnly ? { isAvailable: true } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' as const } },
              {
                description: {
                  contains: filters.search,
                  mode: 'insensitive' as const,
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

  async getMenuItemById(itemId: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: true },
    });

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    return item;
  }

  async updateAvailability(itemId: string, dto: UpdateMenuAvailabilityDto) {
    await this.getMenuItemById(itemId);

    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: dto.isAvailable },
      include: {
        category: true,
      },
    });
  }
}
