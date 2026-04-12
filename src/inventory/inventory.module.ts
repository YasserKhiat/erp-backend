import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MenuModule } from '../menu/menu.module';
import { IngredientsController } from './ingredients.controller';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [CloudinaryModule, MenuModule],
  controllers: [InventoryController, IngredientsController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
