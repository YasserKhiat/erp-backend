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
import { AssignWaiterDto } from './dto/assign-waiter.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { TablesService } from './tables.service';

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create dining table' })
  @ApiBody({ type: CreateTableDto })
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.createTable(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List dining tables and statuses' })
  list() {
    return this.tablesService.listTables();
  }

  @Patch(':tableId/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Update dining table status' })
  @ApiBody({ type: UpdateTableStatusDto })
  @ApiOkResponse({ description: 'Dining table status updated.' })
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
  assignWaiter(
    @Param('tableId') tableId: string,
    @Body() dto: AssignWaiterDto,
  ) {
    return this.tablesService.assignWaiter(tableId, dto);
  }
}
