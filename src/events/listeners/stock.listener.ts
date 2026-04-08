import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderConfirmedEvent } from '../../orders/events';
import { InventoryService } from '../../inventory/inventory.service';

@Injectable()
export class StockListener {
  private readonly logger = new Logger(StockListener.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @OnEvent('order.confirmed')
  async onOrderConfirmed(event: OrderConfirmedEvent) {
    this.logger.log(`Received order.confirmed for order ${event.order.id}`);
    try {
      await this.inventoryService.consumeStockForConfirmedOrder(event);
    } catch (error) {
      this.logger.error(
        `Failed stock update for order ${event.order.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
