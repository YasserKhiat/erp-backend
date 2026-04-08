import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  controllers: [MenuController, CategoriesController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
