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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ApiContractErrors,
  ApiContractOk,
} from '../common/swagger/api-contract.decorators';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { CreateSupplierCatalogItemDto } from './dto/create-supplier-catalog-item.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListProcurementCatalogQueryDto } from './dto/list-procurement-catalog-query.dto';
import { UpdateSupplierOrderStatusDto } from './dto/update-supplier-order-status.dto';
import { UpdateSupplierCatalogItemDto } from './dto/update-supplier-catalog-item.dto';
import { ProcurementService } from './procurement.service';

@ApiTags('procurement')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post('suppliers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create supplier' })
  @ApiBody({ type: CreateSupplierDto })
  @ApiContractOk({ description: 'Supplier created.', dataSchema: { type: 'object' } })
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.procurementService.createSupplier(dto);
  }

  @Get('suppliers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List suppliers' })
  @ApiContractOk({ description: 'Suppliers list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  listSuppliers() {
    return this.procurementService.listSuppliers();
  }

  @Get('suppliers/:supplierId/catalog')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List supplier catalog items' })
  @ApiContractOk({ description: 'Supplier catalog list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  listSupplierCatalog(@Param('supplierId') supplierId: string) {
    return this.procurementService.listSupplierCatalogBySupplier(supplierId);
  }

  @Post('suppliers/:supplierId/catalog')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create supplier catalog item' })
  @ApiBody({ type: CreateSupplierCatalogItemDto })
  @ApiContractOk({ description: 'Supplier catalog item created.', dataSchema: { type: 'object' } })
  createSupplierCatalogItem(
    @Param('supplierId') supplierId: string,
    @Body() dto: CreateSupplierCatalogItemDto,
  ) {
    return this.procurementService.createSupplierCatalogItem(supplierId, dto);
  }

  @Patch('suppliers/:supplierId/catalog/:catalogItemId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update supplier catalog item' })
  @ApiBody({ type: UpdateSupplierCatalogItemDto })
  @ApiContractOk({ description: 'Supplier catalog item updated.', dataSchema: { type: 'object' } })
  updateSupplierCatalogItem(
    @Param('supplierId') supplierId: string,
    @Param('catalogItemId') catalogItemId: string,
    @Body() dto: UpdateSupplierCatalogItemDto,
  ) {
    return this.procurementService.updateSupplierCatalogItem(
      supplierId,
      catalogItemId,
      dto,
    );
  }

  @Get('procurement/catalog')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List procurement catalog across suppliers' })
  @ApiContractOk({ description: 'Procurement catalog list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  listProcurementCatalog(@Query() query: ListProcurementCatalogQueryDto) {
    return this.procurementService.listProcurementCatalog(query);
  }

  @Post('supplier-orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create supplier purchase order' })
  @ApiBody({ type: CreateSupplierOrderDto })
  @ApiContractOk({ description: 'Supplier order created.', dataSchema: { type: 'object' } })
  createSupplierOrder(@Body() dto: CreateSupplierOrderDto) {
    return this.procurementService.createSupplierOrder(dto);
  }

  @Get('supplier-orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List supplier purchase orders' })
  @ApiContractOk({ description: 'Supplier orders list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  listSupplierOrders() {
    return this.procurementService.listSupplierOrders();
  }

  @Patch('supplier-orders/:supplierOrderId/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update supplier purchase order status' })
  @ApiBody({ type: UpdateSupplierOrderStatusDto })
  @ApiContractOk({ description: 'Supplier order status updated.', dataSchema: { type: 'object' } })
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
  @ApiContractOk({ description: 'Supplier order received and stock updated.', dataSchema: { type: 'object' } })
  receiveSupplierOrder(@Param('supplierOrderId') supplierOrderId: string) {
    return this.procurementService.receiveSupplierOrder(supplierOrderId);
  }
}
