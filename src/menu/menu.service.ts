import { Injectable } from '@nestjs/common';
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

  getMenu(availableOnly = false) {
    return this.prisma.menuItem.findMany({
      where: availableOnly ? { isAvailable: true } : undefined,
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
