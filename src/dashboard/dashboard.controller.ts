import {
  Controller,
  Get,
  Header,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
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

  @Get('report/export/pdf')
  @ApiOperation({ summary: 'Export dashboard report as PDF' })
  @ApiContractOk({ description: 'PDF report file.', dataSchema: { type: 'string', format: 'binary' } })
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="dashboard-report.pdf"')
  async exportReportPdf(@Query() query: DashboardQueryDto) {
    const pdf = await this.dashboardService.exportReportPdf(query);
    return new StreamableFile(pdf);
  }

  @Get('report/export/excel')
  @ApiOperation({ summary: 'Export dashboard report as Excel file' })
  @ApiContractOk({ description: 'Excel report file.', dataSchema: { type: 'string', format: 'binary' } })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="dashboard-report.xlsx"')
  async exportReportExcel(@Query() query: DashboardQueryDto) {
    const excel = await this.dashboardService.exportReportExcel(query);
    return new StreamableFile(excel);
  }
}
