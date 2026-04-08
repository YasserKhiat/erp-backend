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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginateArray } from '../common/utils/pagination';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { StockMovementHistoryQueryDto } from './dto/stock-movement-history-query.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('ingredients')
  @ApiOperation({ summary: 'Create ingredient and initial stock' })
  createIngredient(@Body() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Create stock movement and update inventory' })
  moveStock(@Body() dto: StockMovementDto) {
    return this.inventoryService.applyMovement(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get inventory list' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getInventory(@Query() pagination?: PaginationQueryDto) {
    return this.inventoryService
      .getInventory()
      .then((items) => paginateArray(items, pagination));
  }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getLowStock(@Query() pagination?: PaginationQueryDto) {
    return this.inventoryService
      .getLowStockItems()
      .then((items) => paginateArray(items, pagination));
  }

  @Get('movements/history')
  @ApiOperation({ summary: 'Get stock movement history with filters' })
  @ApiQuery({ name: 'ingredientId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getMovementHistory(@Query() query: StockMovementHistoryQueryDto) {
    return this.inventoryService
      .getStockMovementHistory(query)
      .then((items) => paginateArray(items, query));
  }

  @Delete('ingredients/:ingredientId')
  @ApiOperation({ summary: 'Delete ingredient if not used by any recipe' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  removeIngredient(@Param('ingredientId') ingredientId: string) {
    return this.inventoryService.deleteIngredient(ingredientId);
  }
}
