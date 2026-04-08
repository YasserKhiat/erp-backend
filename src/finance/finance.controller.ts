import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AnnualSummaryQueryDto } from './dto/annual-summary-query.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('expenses')
  @ApiOperation({ summary: 'Create fixed or variable expense' })
  @ApiBody({ type: CreateExpenseDto })
  createExpense(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateExpenseDto,
  ) {
    return this.financeService.createExpense(user.id, dto);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'List expenses with optional filters' })
  listExpenses(@Query() query: ListExpensesQueryDto) {
    return this.financeService.listExpenses(query);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Aggregate revenue by daily, weekly, or monthly period' })
  getRevenue(@Query() query: RevenueQueryDto) {
    return this.financeService.getRevenueAggregation(query);
  }

  @Get('profit/monthly')
  @ApiOperation({ summary: 'Monthly profitability breakdown for one year' })
  getMonthlyProfitability(@Query() query: AnnualSummaryQueryDto) {
    return this.financeService.getMonthlyProfitability(query);
  }

  @Get('profit/annual')
  @ApiOperation({ summary: 'Annual profitability summary and trend' })
  getAnnualSummary(@Query() query: AnnualSummaryQueryDto) {
    return this.financeService.getAnnualSummary(query);
  }
}
