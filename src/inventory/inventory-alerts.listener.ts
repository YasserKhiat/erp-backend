import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class InventoryAlertsListener {
  private readonly logger = new Logger(InventoryAlertsListener.name);

  @OnEvent('stock.low')
  onLowStock(payload: { ingredientId: string }) {
    this.logger.warn(`Low stock alert for ingredient ${payload.ingredientId}`);
  }
}
