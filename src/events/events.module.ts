import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsListener } from './listeners/analytics.listener';
import { LoyaltyListener } from './listeners/loyalty.listener';
import { NotificationListener } from './listeners/notification.listener';
import { PaymentListener } from './listeners/payment.listener';
import { StockListener } from './listeners/stock.listener';

@Module({
  imports: [PrismaModule, InventoryModule, LoyaltyModule, NotificationsModule],
  providers: [
    StockListener,
    PaymentListener,
    LoyaltyListener,
    AnalyticsListener,
    NotificationListener,
  ],
})
export class EventsModule {}
