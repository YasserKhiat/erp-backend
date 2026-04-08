import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiContractErrors, ApiContractOk } from '../common/swagger/api-contract.decorators';
import { MenuService } from './menu.service';

@ApiTags('categories')
@ApiContractErrors()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({
    summary: 'Browse categories (frontend endpoint)',
    description: 'Returns categories including nested menu items.',
  })
  @ApiContractOk({
    description: 'Categories list.',
    dataSchema: {
      type: 'array',
      items: { type: 'object' },
    },
  })
  getCategories() {
    return this.menuService.getCategories();
  }
}
