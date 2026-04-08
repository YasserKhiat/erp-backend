import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierOrderStatusDto } from './dto/update-supplier-order-status.dto';
import { ProcurementService } from './procurement.service';

@ApiTags('procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post('suppliers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create supplier' })
  @ApiBody({ type: CreateSupplierDto })
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.procurementService.createSupplier(dto);
  }

  @Get('suppliers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List suppliers' })
  listSuppliers() {
    return this.procurementService.listSuppliers();
  }

  @Post('supplier-orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create supplier purchase order' })
  @ApiBody({ type: CreateSupplierOrderDto })
  createSupplierOrder(@Body() dto: CreateSupplierOrderDto) {
    return this.procurementService.createSupplierOrder(dto);
  }

  @Get('supplier-orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List supplier purchase orders' })
  listSupplierOrders() {
    return this.procurementService.listSupplierOrders();
  }

  @Patch('supplier-orders/:supplierOrderId/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update supplier purchase order status' })
  @ApiBody({ type: UpdateSupplierOrderStatusDto })
  updateSupplierOrderStatus(
    @Param('supplierOrderId') supplierOrderId: string,
    @Body() dto: UpdateSupplierOrderStatusDto,
  ) {
    return this.procurementService.updateSupplierOrderStatus(supplierOrderId, dto);
  }

  @Patch('supplier-orders/:supplierOrderId/receive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Receive supplier purchase order and increment inventory',
  })
  @ApiOkResponse({ description: 'Supplier order received and stock updated.' })
  receiveSupplierOrder(@Param('supplierOrderId') supplierOrderId: string) {
    return this.procurementService.receiveSupplierOrder(supplierOrderId);
  }
}
