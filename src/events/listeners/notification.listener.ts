import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReservationCreatedEvent, StockLowEvent } from '../../orders/events';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  @OnEvent('stock.low')
  onStockLow(event: StockLowEvent) {
    this.logger.warn(`Notification alert: low stock for ingredient ${event.ingredientId}`);
  }

  @OnEvent('reservation.created')
  onReservationCreated(event: ReservationCreatedEvent) {
    this.logger.log(
      `Notification event: reservation ${event.reservation.id} created for table ${event.reservation.tableId}`,
    );
  }
}
