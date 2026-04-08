import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';

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
}
