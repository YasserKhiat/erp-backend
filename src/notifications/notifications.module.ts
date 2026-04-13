import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailService } from './mail.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsListener } from './notifications.listener';
import { NotificationsRealtimeService } from './notifications-realtime.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    MailService,
    NotificationsService,
    NotificationsListener,
    NotificationsRealtimeService,
  ],
  exports: [MailService, NotificationsService, NotificationsRealtimeService],
})
export class NotificationsModule {}
