import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [MenuController, CategoriesController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
