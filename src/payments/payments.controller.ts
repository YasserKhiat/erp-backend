import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Register payment for an order' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  createPayment(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Payment transaction history' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getTransactions() {
    return this.paymentsService.getTransactions();
  }

  @Get('closing/daily')
  @ApiOperation({ summary: 'Daily closing report' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getDailyClosing(@Query('date') date?: string) {
    return this.paymentsService.getDailyClosing(date);
  }
}
