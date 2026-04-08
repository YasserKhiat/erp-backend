import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoyaltyUpdatedEvent } from '../../orders/events';
import { LoyaltyService } from '../../loyalty/loyalty.service';

@Injectable()
export class LoyaltyListener {
  private readonly logger = new Logger(LoyaltyListener.name);

  constructor(private readonly loyaltyService: LoyaltyService) {}

  @OnEvent('loyalty.updated')
  async onLoyaltyUpdated(event: LoyaltyUpdatedEvent) {
    this.logger.log(`Received loyalty.updated for order ${event.loyalty.orderId}`);
    try {
      await this.loyaltyService.applyLoyaltyUpdateFromEvent(event);
    } catch (error) {
      this.logger.error(
        `Failed loyalty update for order ${event.loyalty.orderId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
