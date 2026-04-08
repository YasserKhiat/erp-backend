import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { MenuService } from './menu.service';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({
    summary: 'Browse menu items (frontend endpoint)',
    description: 'Primary frontend menu endpoint with optional filters.',
  })
  @ApiQuery({ name: 'availableOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  getMenu(
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

  @Get('categories')
  @ApiOperation({ summary: 'Browse all categories with menu items' })
  getCategories() {
    return this.menuService.getCategories();
  }

  @Get('items')
  @ApiOperation({ summary: 'Browse menu items (legacy alias)' })
  @ApiQuery({ name: 'availableOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
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
}
