import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
import { AdjustLoyaltyPointsDto } from './dto/adjust-loyalty-points.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get loyalty account and recent transactions' })
  @Roles(UserRole.CLIENT)
  getMyLoyalty(@CurrentUser() user: { id: string }) {
    return this.loyaltyService.getMyLoyalty(user.id);
  }

  @Post('me/redeem')
  @ApiOperation({ summary: 'Redeem loyalty points into reward discount' })
  @ApiBody({ type: RedeemRewardDto })
  @Roles(UserRole.CLIENT)
  redeemReward(
    @CurrentUser() user: { id: string },
    @Body() dto: RedeemRewardDto,
  ) {
    return this.loyaltyService.redeemReward(user.id, dto);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Apply manual loyalty points adjustment' })
  @ApiBody({ type: AdjustLoyaltyPointsDto })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  adjustPoints(
    @CurrentUser() actor: { role: UserRole },
    @Body() dto: AdjustLoyaltyPointsDto,
  ) {
    return this.loyaltyService.adjustPoints(actor, dto);
  }
}
