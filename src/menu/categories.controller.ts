import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenuService } from './menu.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({
    summary: 'Browse categories (frontend endpoint)',
    description: 'Returns categories including nested menu items.',
  })
  getCategories() {
    return this.menuService.getCategories();
  }
}
