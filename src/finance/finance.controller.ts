import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ApiContractErrors,
  ApiContractListOk,
  ApiContractOk,
} from '../common/swagger/api-contract.decorators';
import { AnnualSummaryQueryDto } from './dto/annual-summary-query.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('expenses')
  @ApiOperation({ summary: 'Create fixed or variable expense' })
  @ApiBody({ type: CreateExpenseDto })
  @ApiContractOk({ description: 'Expense created.', dataSchema: { type: 'object' } })
  createExpense(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateExpenseDto,
  ) {
    return this.financeService.createExpense(user.id, dto);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'List expenses with optional filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated expenses list.' })
  listExpenses(@Query() query: ListExpensesQueryDto) {
    return this.financeService.listExpenses(query);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Aggregate revenue by daily, weekly, or monthly period' })
  @ApiContractOk({ description: 'Revenue aggregation.', dataSchema: { type: 'object' } })
  getRevenue(@Query() query: RevenueQueryDto) {
    return this.financeService.getRevenueAggregation(query);
  }

  @Get('profit/monthly')
  @ApiOperation({ summary: 'Monthly profitability breakdown for one year' })
  @ApiContractOk({ description: 'Monthly profitability summary.', dataSchema: { type: 'object' } })
  getMonthlyProfitability(@Query() query: AnnualSummaryQueryDto) {
    return this.financeService.getMonthlyProfitability(query);
  }

  @Get('profit/annual')
  @ApiOperation({ summary: 'Annual profitability summary and trend' })
  @ApiContractOk({ description: 'Annual profitability summary.', dataSchema: { type: 'object' } })
  getAnnualSummary(@Query() query: AnnualSummaryQueryDto) {
    return this.financeService.getAnnualSummary(query);
  }
}
