import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ApiContractErrors,
  ApiContractOk,
} from '../common/swagger/api-contract.decorators';
import { imageUploadMulterOptions } from '../common/utils/image-upload.config';
import { InventoryService } from './inventory.service';

@ApiTags('ingredients')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List ingredients' })
  @ApiContractOk({
    description: 'Ingredients list.',
    dataSchema: {
      type: 'array',
      items: { type: 'object' },
    },
  })
  listIngredients() {
    return this.inventoryService.listIngredients();
  }

  @Post(':id/image')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload ingredient image (Cloudinary)' })
  @UseInterceptors(FileInterceptor('file', imageUploadMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiContractOk({
    description: 'Ingredient image uploaded.',
    dataSchema: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          format: 'uri',
        },
      },
      required: ['imageUrl'],
    },
  })
  uploadIngredientImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.inventoryService.uploadIngredientImage(id, file);
  }
}
