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
import { paginateArray } from '../common/utils/pagination';
import { CloseDailyCashDto } from './dto/close-daily-cash.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateMixedPaymentDto } from './dto/create-mixed-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Register payment for an order' })
  @ApiBody({ type: CreatePaymentDto })
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getTransactions(@Query() pagination?: PaginationQueryDto) {
    return this.paymentsService
      .getTransactions()
      .then((items) => paginateArray(items, pagination));
  }

  @Get('me')
  @ApiOperation({ summary: 'Payment history for current client' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @Roles(UserRole.CLIENT)
  getMyTransactions(
    @CurrentUser() user: { id: string },
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.paymentsService
      .getMyTransactions(user.id)
      .then((items) => paginateArray(items, pagination));
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'List payments for one order' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getDailyClosing(@Query('date') date?: string) {
    return this.paymentsService.getDailyClosing(date);
  }

  @Post('closing/daily')
  @ApiOperation({ summary: 'Finalize daily cash closing with discrepancy tracking' })
  @ApiBody({ type: CloseDailyCashDto })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  closeDailyCash(
    @CurrentUser() user: { id: string },
    @Body() dto: CloseDailyCashDto,
  ) {
    return this.paymentsService.closeDailyCash(user.id, dto);
  }

  @Get('treasury/summary')
  @ApiOperation({ summary: 'Treasury inflow summary for a period' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getTreasurySummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.paymentsService.getTreasurySummary(from, to);
  }
}
