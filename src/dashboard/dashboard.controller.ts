import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiContractErrors, ApiContractOk } from '../common/swagger/api-contract.decorators';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard analytics overview' })
  @ApiContractOk({ description: 'Dashboard overview metrics.', dataSchema: { type: 'object' } })
  getOverview(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getOverview(query);
  }

  @Get('report')
  @ApiOperation({ summary: 'Report/export-ready dashboard structure' })
  @ApiContractOk({ description: 'Dashboard report payload.', dataSchema: { type: 'object' } })
  getReport(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getReportData(query);
  }
}
