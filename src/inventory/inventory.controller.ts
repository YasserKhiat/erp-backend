import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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
  getInventory() {
    return this.inventoryService.getInventory();
  }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  getLowStock() {
    return this.inventoryService.getLowStockItems();
  }

  @Get('movements/history')
  @ApiOperation({ summary: 'Get stock movement history with filters' })
  @ApiQuery({ name: 'ingredientId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  getMovementHistory(@Query() query: StockMovementHistoryQueryDto) {
    return this.inventoryService.getStockMovementHistory(query);
  }
}
