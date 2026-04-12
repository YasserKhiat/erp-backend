import { PartialType } from '@nestjs/swagger';
import { CreateSupplierCatalogItemDto } from './create-supplier-catalog-item.dto';

export class UpdateSupplierCatalogItemDto extends PartialType(CreateSupplierCatalogItemDto) {}
