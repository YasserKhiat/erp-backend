import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ApiContractErrors,
  ApiContractListOk,
  ApiContractOk,
} from '../common/swagger/api-contract.decorators';
import { paginateArray } from '../common/utils/pagination';
import { CloseDailyCashDto } from './dto/close-daily-cash.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateMixedPaymentDto } from './dto/create-mixed-payment.dto';
import { PaymentsService } from './payments.service';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { CreateBankMovementDto } from './dto/create-bank-movement.dto';
import { RunReconciliationDto } from './dto/run-reconciliation.dto';

@ApiTags('payments')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Register payment for an order' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiContractOk({ description: 'Payment registered.', dataSchema: { type: 'object' } })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  createPayment(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(user.id, dto);
  }

  @Post('mixed')
  @ApiOperation({ summary: 'Register mixed payment for an order' })
  @ApiBody({ type: CreateMixedPaymentDto })
  @ApiContractOk({ description: 'Mixed payments registered.', dataSchema: { type: 'object' } })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  createMixedPayment(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMixedPaymentDto,
  ) {
    return this.paymentsService.createMixedPayment(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Payment transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated payment transactions history.' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getTransactions(
    @Query() pagination?: PaginationQueryDto,
    @Query() query?: ListPaymentsQueryDto,
  ) {
    return this.paymentsService
      .getTransactions(query)
      .then((items) => paginateArray(items, pagination));
  }

  @Get('me')
  @ApiOperation({ summary: 'Payment history for current client' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated client payment history.' })
  @Roles(UserRole.CLIENT)
  getMyTransactions(
    @CurrentUser() user: { id: string },
    @Query() query?: ListPaymentsQueryDto,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.paymentsService
      .getMyTransactions(user.id, query)
      .then((items) => paginateArray(items, pagination));
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'List payments for one order' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated payments list for one order.' })
  @Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  getOrderPayments(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.paymentsService
      .getOrderPayments(orderId, user)
      .then((payload) => paginateArray(payload.payments, pagination));
  }

  @Get('closing/daily')
  @ApiOperation({ summary: 'Daily closing report' })
  @ApiContractOk({ description: 'Daily closing report.', dataSchema: { type: 'object' } })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getDailyClosing(@Query('date') date?: string) {
    return this.paymentsService.getDailyClosing(date);
  }

  @Post('closing/daily')
  @ApiOperation({ summary: 'Finalize daily cash closing with discrepancy tracking' })
  @ApiBody({ type: CloseDailyCashDto })
  @ApiContractOk({ description: 'Daily cash closing finalized.', dataSchema: { type: 'object' } })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  closeDailyCash(
    @CurrentUser() user: { id: string },
    @Body() dto: CloseDailyCashDto,
  ) {
    return this.paymentsService.closeDailyCash(user.id, dto);
  }

  @Get('treasury/summary')
  @ApiOperation({ summary: 'Treasury inflow summary for a period' })
  @ApiContractOk({ description: 'Treasury summary for period.', dataSchema: { type: 'object' } })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getTreasurySummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query() filters?: ListPaymentsQueryDto,
  ) {
    return this.paymentsService.getTreasurySummary(from, to, filters);
  }

  @Get('reconciliation')
  @ApiOperation({ summary: 'Reconciliation summary and recent sessions' })
  @ApiContractOk({ description: 'Reconciliation summary.', dataSchema: { type: 'object' } })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getReconciliation(@Query('from') from?: string, @Query('to') to?: string) {
    return this.paymentsService.getReconciliationSummary(from, to);
  }

  @Post('reconciliation/bank-movement')
  @ApiOperation({ summary: 'Create bank movement entry for reconciliation' })
  @ApiBody({ type: CreateBankMovementDto })
  @ApiContractOk({ description: 'Bank movement created.', dataSchema: { type: 'object' } })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createBankMovement(@Body() dto: CreateBankMovementDto) {
    return this.paymentsService.createBankMovement(dto);
  }

  @Post('reconciliation/run')
  @ApiOperation({ summary: 'Run reconciliation session for period' })
  @ApiBody({ type: RunReconciliationDto })
  @ApiContractOk({ description: 'Reconciliation run completed.', dataSchema: { type: 'object' } })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  runReconciliation(@Body() dto: RunReconciliationDto) {
    return this.paymentsService.runReconciliation(dto);
  }
}
