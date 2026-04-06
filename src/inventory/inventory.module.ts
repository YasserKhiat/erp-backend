import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryAlertsListener } from './inventory-alerts.listener';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryAlertsListener],
  exports: [InventoryService],
})
export class InventoryModule {}
