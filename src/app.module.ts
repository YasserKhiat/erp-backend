import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { InventoryModule } from './inventory/inventory.module';
import { PaymentsModule } from './payments/payments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TablesModule } from './tables/tables.module';
import { ProcurementModule } from './procurement/procurement.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ReviewsModule } from './reviews/reviews.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { FinanceModule } from './finance/finance.module';
import { EventsModule } from './events/events.module';
import { PersonnelModule } from './personnel/personnel.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    MenuModule,
    OrdersModule,
    TablesModule,
    InventoryModule,
    ProcurementModule,
    ReservationsModule,
    ReviewsModule,
    LoyaltyModule,
    FinanceModule,
    PersonnelModule,
    PaymentsModule,
    DashboardModule,
    NotificationsModule,
    EventsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
