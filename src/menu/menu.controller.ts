import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateFormulaBundleDto } from './dto/create-formula-bundle.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { SetMenuItemRecipeDto } from './dto/set-menu-item-recipe.dto';
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

  @Post('items/:id/recipe')
  @ApiOperation({ summary: 'Set menu item recipe (dish composition)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  setMenuItemRecipe(@Param('id') id: string, @Body() dto: SetMenuItemRecipeDto) {
    return this.menuService.setMenuItemRecipe(id, dto);
  }

  @Get('items/:id/recipe')
  @ApiOperation({ summary: 'Get menu item recipe details' })
  getMenuItemRecipe(@Param('id') id: string) {
    return this.menuService.getMenuItemRecipe(id);
  }

  @Post('formulas')
  @ApiOperation({ summary: 'Create menu formula bundle' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createFormulaBundle(@Body() dto: CreateFormulaBundleDto) {
    return this.menuService.createFormulaBundle(dto);
  }

  @Get('formulas')
  @ApiOperation({ summary: 'List formula bundles' })
  @ApiQuery({ name: 'availableOnly', required: false, type: Boolean })
  getFormulaBundles(@Query('availableOnly') availableOnly?: string) {
    return this.menuService.getFormulaBundles(availableOnly === 'true');
  }

  @Get('items/:id/margin')
  @ApiOperation({ summary: 'Get estimated dish margin from recipe and supplier costs' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getMenuItemMargin(@Param('id') id: string) {
    return this.menuService.getMenuItemMargin(id);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete menu item if not used by active orders' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  removeMenuItem(@Param('id') id: string) {
    return this.menuService.deleteMenuItem(id);
  }
}
