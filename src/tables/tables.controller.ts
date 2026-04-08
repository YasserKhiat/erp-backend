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
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiContractErrors, ApiContractOk } from '../common/swagger/api-contract.decorators';
import { AssignWaiterDto } from './dto/assign-waiter.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { TablesService } from './tables.service';

@ApiTags('tables')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create dining table' })
  @ApiBody({ type: CreateTableDto })
  @ApiContractOk({ description: 'Dining table created.', dataSchema: { type: 'object' } })
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.createTable(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List dining tables and statuses' })
  @ApiContractOk({ description: 'Dining tables list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  list() {
    return this.tablesService.listTables();
  }

  @Patch(':tableId/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Update dining table status' })
  @ApiBody({ type: UpdateTableStatusDto })
  @ApiContractOk({ description: 'Dining table status updated.', dataSchema: { type: 'object' } })
  updateStatus(
    @Param('tableId') tableId: string,
    @Body() dto: UpdateTableStatusDto,
  ) {
    return this.tablesService.updateStatus(tableId, dto);
  }

  @Patch(':tableId/assign-waiter')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign or unassign waiter for a table' })
  @ApiBody({ type: AssignWaiterDto })
  @ApiContractOk({ description: 'Table waiter assignment updated.', dataSchema: { type: 'object' } })
  assignWaiter(
    @Param('tableId') tableId: string,
    @Body() dto: AssignWaiterDto,
  ) {
    return this.tablesService.assignWaiter(tableId, dto);
  }
}
