import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { paginateArray } from '../common/utils/pagination';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApiContractErrors,
  ApiContractListOk,
  ApiContractOk,
} from '../common/swagger/api-contract.decorators';
import { UserRole } from '../common/constants/domain-enums';
import { CreateFormulaBundleDto } from './dto/create-formula-bundle.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { SetMenuItemRecipeDto } from './dto/set-menu-item-recipe.dto';
import { imageUploadMulterOptions } from '../common/utils/image-upload.config';
import { MenuService } from './menu.service';

@ApiTags('menu')
@ApiContractErrors()
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
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated menu items list.' })
  getMenu(
    @Query('availableOnly') availableOnly?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.menuService
      .getMenu({
        availableOnly: availableOnly === 'true',
        categoryId,
        search,
      })
      .then((items) =>
        paginateArray(items, {
          page: Number(page) || 1,
          limit: Number(limit) || 10,
        }),
      );
  }

  @Get('categories')
  @ApiOperation({ summary: 'Browse all categories with menu items' })
  @ApiContractOk({
    description: 'Categories with nested menu items.',
    dataSchema: {
      type: 'array',
      items: { type: 'object' },
    },
  })
  getCategories() {
    return this.menuService.getCategories();
  }

  @Get('items')
  @ApiOperation({ summary: 'Browse menu items (legacy alias)' })
  @ApiQuery({ name: 'availableOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated legacy menu items list.' })
  getItems(
    @Query('availableOnly') availableOnly?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.menuService
      .getMenu({
        availableOnly: availableOnly === 'true',
        categoryId,
        search,
      })
      .then((items) =>
        paginateArray(items, {
          page: Number(page) || 1,
          limit: Number(limit) || 10,
        }),
      );
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create menu category' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiContractOk({ description: 'Menu category created.', dataSchema: { type: 'object' } })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @Post('items')
  @ApiOperation({ summary: 'Create menu item' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiContractOk({ description: 'Menu item created.', dataSchema: { type: 'object' } })
  createMenuItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createMenuItem(dto);
  }

  @Post('items/:id/recipe')
  @ApiOperation({ summary: 'Set menu item recipe (dish composition)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiContractOk({ description: 'Recipe assigned to menu item.', dataSchema: { type: 'object' } })
  setMenuItemRecipe(@Param('id') id: string, @Body() dto: SetMenuItemRecipeDto) {
    return this.menuService.setMenuItemRecipe(id, dto);
  }

  @Get('items/:id/recipe')
  @ApiOperation({ summary: 'Get menu item recipe details' })
  @ApiContractOk({ description: 'Menu item recipe details.', dataSchema: { type: 'object' } })
  getMenuItemRecipe(@Param('id') id: string) {
    return this.menuService.getMenuItemRecipe(id);
  }

  @Post('formulas')
  @ApiOperation({ summary: 'Create menu formula bundle' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiContractOk({ description: 'Formula bundle created.', dataSchema: { type: 'object' } })
  createFormulaBundle(@Body() dto: CreateFormulaBundleDto) {
    return this.menuService.createFormulaBundle(dto);
  }

  @Get('formulas')
  @ApiOperation({ summary: 'List formula bundles' })
  @ApiQuery({ name: 'availableOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated formula bundles list.' })
  getFormulaBundles(
    @Query('availableOnly') availableOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.menuService
      .getFormulaBundles(availableOnly === 'true')
      .then((items) =>
        paginateArray(items, {
          page: Number(page) || 1,
          limit: Number(limit) || 10,
        }),
      );
  }

  @Get('items/:id/margin')
  @ApiOperation({ summary: 'Get estimated dish margin from recipe and supplier costs' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiContractOk({ description: 'Menu item margin details.', dataSchema: { type: 'object' } })
  getMenuItemMargin(@Param('id') id: string) {
    return this.menuService.getMenuItemMargin(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item details by id' })
  @ApiContractOk({ description: 'Menu item details.', dataSchema: { type: 'object' } })
  getMenuItemById(@Param('id') id: string) {
    return this.menuService.getMenuItemById(id);
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Upload menu item image (Cloudinary)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', imageUploadMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiContractOk({
    description: 'Menu item image uploaded.',
    dataSchema: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          format: 'uri',
        },
      },
      required: ['imageUrl'],
    },
  })
  uploadMenuItemImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.menuService.uploadMenuItemImage(id, file);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete menu item if not used by active orders' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiContractOk({ description: 'Menu item deletion result.', dataSchema: { type: 'object' } })
  removeMenuItem(@Param('id') id: string) {
    return this.menuService.deleteMenuItem(id);
  }
}
