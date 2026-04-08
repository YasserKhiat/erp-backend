import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  LoyaltyTransactionType,
  UserRole,
} from '../common/constants/domain-enums';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustLoyaltyPointsDto } from './dto/adjust-loyalty-points.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { OrderCompletedEvent } from '../orders/events';

@Injectable()
export class LoyaltyService {
  private readonly pointsPerCurrencyUnit = 1;
  private readonly milestoneOrderCount = 5;
  private readonly milestoneBonusPoints = 20;
  private readonly rewardCostPoints = 100;
  private readonly rewardDiscountAmount = 10;

  constructor(private readonly prisma: PrismaService) {}

  private normalizePointsFromTotal(total: number): number {
    return Math.max(1, Math.floor(total * this.pointsPerCurrencyUnit));
  }

  async getMyLoyalty(userId: string) {
    const account = await this.prisma.loyaltyAccount.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      ...account,
      nextRewardAtPoints: this.rewardCostPoints,
      pointsToNextReward: Math.max(this.rewardCostPoints - account.points, 0),
      transactions,
    };
  }

  async redeemReward(userId: string, dto: RedeemRewardDto) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.loyaltyAccount.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      const requiredPoints = this.rewardCostPoints * dto.quantity;
      if (account.points < requiredPoints) {
        throw new ConflictException('INSUFFICIENT_LOYALTY_POINTS');
      }

      const updated = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: {
            decrement: requiredPoints,
          },
        },
      });

      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          userId,
          type: LoyaltyTransactionType.REDEEM_REWARD,
          pointsDelta: -requiredPoints,
          balanceAfter: updated.points,
          reason: `Redeemed ${dto.quantity} reward(s)`,
        },
      });

      return {
        account: updated,
        reward: {
          quantity: dto.quantity,
          discountAmount: this.rewardDiscountAmount * dto.quantity,
          pointsSpent: requiredPoints,
        },
      };
    });
  }

  async adjustPoints(actor: { role: UserRole }, dto: AdjustLoyaltyPointsDto) {
    if (dto.pointsDelta === 0) {
      throw new BadRequestException('INVALID_INPUT');
    }

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.loyaltyAccount.upsert({
        where: { userId: dto.userId },
        update: {},
        create: { userId: dto.userId },
      });

      const nextPoints = account.points + dto.pointsDelta;
      if (nextPoints < 0) {
        throw new ConflictException('NEGATIVE_LOYALTY_BALANCE');
      }

      const updated = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: nextPoints,
          lifetimePoints:
            dto.pointsDelta > 0
              ? {
                  increment: dto.pointsDelta,
                }
              : undefined,
        },
      });

      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          userId: dto.userId,
          type: LoyaltyTransactionType.MANUAL_ADJUSTMENT,
          pointsDelta: dto.pointsDelta,
          balanceAfter: updated.points,
          reason:
            dto.reason ??
            `Manual adjustment by ${actor.role.toLowerCase()}`,
        },
      });

      return updated;
    });
  }

  @OnEvent('order.completed')
  async onOrderCompleted(event: OrderCompletedEvent) {
    const earnReference = `earn:${event.order.id}`;

    await this.prisma.$transaction(async (tx) => {
      const existingEarn = await tx.loyaltyTransaction.findUnique({
        where: { referenceKey: earnReference },
        select: { id: true },
      });

      if (existingEarn) {
        return;
      }

      const account = await tx.loyaltyAccount.upsert({
        where: { userId: event.order.customerId },
        update: {},
        create: { userId: event.order.customerId },
      });

      const earned = this.normalizePointsFromTotal(event.order.total);
      let updated = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: {
            increment: earned,
          },
          lifetimePoints: {
            increment: earned,
          },
          completedOrders: {
            increment: 1,
          },
        },
      });

      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          userId: event.order.customerId,
          orderId: event.order.id,
          type: LoyaltyTransactionType.EARN_ORDER,
          pointsDelta: earned,
          balanceAfter: updated.points,
          reason: `Points earned from order #${event.order.orderNumber}`,
          referenceKey: earnReference,
        },
      });

      if (updated.completedOrders % this.milestoneOrderCount === 0) {
        const bonusReference = `bonus:${event.order.id}:${updated.completedOrders}`;

        const existingBonus = await tx.loyaltyTransaction.findUnique({
          where: { referenceKey: bonusReference },
          select: { id: true },
        });

        if (!existingBonus) {
          updated = await tx.loyaltyAccount.update({
            where: { id: account.id },
            data: {
              points: {
                increment: this.milestoneBonusPoints,
              },
              lifetimePoints: {
                increment: this.milestoneBonusPoints,
              },
            },
          });

          await tx.loyaltyTransaction.create({
            data: {
              accountId: account.id,
              userId: event.order.customerId,
              orderId: event.order.id,
              type: LoyaltyTransactionType.BONUS_MILESTONE,
              pointsDelta: this.milestoneBonusPoints,
              balanceAfter: updated.points,
              reason: `Milestone bonus for ${updated.completedOrders} completed orders`,
              referenceKey: bonusReference,
            },
          });
        }
      }
    });
  }
}
