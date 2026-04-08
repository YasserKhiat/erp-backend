import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuAvailabilityDto } from './dto/update-menu-availability.dto';
import { MenuService } from './menu.service';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Browse all categories with menu items' })
  getCategories() {
    return this.menuService.getCategories();
  }

  @Get('items')
  @ApiOperation({ summary: 'Browse menu items' })
  getItems(
    @Query('availableOnly') availableOnly?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.menuService.getMenu({
      availableOnly: availableOnly === 'true',
      categoryId,
      search,
    });
  }

  @Get('items/:itemId')
  @ApiOperation({ summary: 'Get menu item details' })
  getItem(@Param('itemId') itemId: string) {
    return this.menuService.getMenuItemById(itemId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create menu category' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @Post('items')
  @ApiOperation({ summary: 'Create menu item' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createMenuItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createMenuItem(dto);
  }

  @Patch('items/:itemId/availability')
  @ApiOperation({ summary: 'Update menu item availability' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateAvailability(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMenuAvailabilityDto,
  ) {
    return this.menuService.updateAvailability(itemId, dto);
  }
}
