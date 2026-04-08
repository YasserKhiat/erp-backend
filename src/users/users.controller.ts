import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiContractErrors, ApiContractOk } from '../common/swagger/api-contract.decorators';
import { CreateClientAddressDto } from './dto/create-client-address.dto';
import { FavoriteMenuItemDto } from './dto/favorite-menu-item.dto';
import { UpdateClientPreferencesDto } from './dto/update-client-preferences.dto';
import { UsersService } from './users.service';

@ApiTags('client-profile')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLIENT)
@Controller('clients/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('addresses')
  @ApiOperation({ summary: 'List my saved addresses' })
  @ApiContractOk({ description: 'Client addresses list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  getAddresses(@CurrentUser() user: { id: string }) {
    return this.usersService.listAddresses(user.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new address' })
  @ApiBody({ type: CreateClientAddressDto })
  @ApiContractOk({ description: 'Address created.', dataSchema: { type: 'object' } })
  createAddress(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateClientAddressDto,
  ) {
    return this.usersService.createAddress(user.id, dto);
  }

  @Patch('addresses/:addressId/default')
  @ApiOperation({ summary: 'Set default address' })
  @ApiContractOk({ description: 'Default address updated.', dataSchema: { type: 'object' } })
  setDefaultAddress(
    @CurrentUser() user: { id: string },
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.setDefaultAddress(user.id, addressId);
  }

  @Delete('addresses/:addressId')
  @ApiOperation({ summary: 'Delete an address' })
  @ApiContractOk({ description: 'Address deletion result.', dataSchema: { type: 'object' } })
  removeAddress(
    @CurrentUser() user: { id: string },
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.removeAddress(user.id, addressId);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get client preferences' })
  @ApiContractOk({ description: 'Client preferences.', dataSchema: { type: 'object' } })
  getPreferences(@CurrentUser() user: { id: string }) {
    return this.usersService.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update client preferences' })
  @ApiBody({ type: UpdateClientPreferencesDto })
  @ApiContractOk({ description: 'Client preferences updated.', dataSchema: { type: 'object' } })
  updatePreferences(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateClientPreferencesDto,
  ) {
    return this.usersService.upsertPreferences(user.id, dto);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'List favorite menu items' })
  @ApiContractOk({ description: 'Favorite menu items list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  getFavorites(@CurrentUser() user: { id: string }) {
    return this.usersService.listFavorites(user.id);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List billed orders with payment history' })
  @ApiContractOk({ description: 'Client invoices list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  getInvoices(@CurrentUser() user: { id: string }) {
    return this.usersService.getInvoiceHistory(user.id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get frontend-ready client profile summary' })
  @ApiContractOk({ description: 'Client profile summary.', dataSchema: { type: 'object' } })
  getProfileSummary(@CurrentUser() user: { id: string }) {
    return this.usersService.getProfileSummary(user.id);
  }

  @Post('favorites')
  @ApiOperation({ summary: 'Add menu item to favorites' })
  @ApiBody({ type: FavoriteMenuItemDto })
  @ApiContractOk({ description: 'Favorite item added.', dataSchema: { type: 'object' } })
  addFavorite(
    @CurrentUser() user: { id: string },
    @Body() dto: FavoriteMenuItemDto,
  ) {
    return this.usersService.addFavorite(user.id, dto.menuItemId);
  }

  @Delete('favorites/:menuItemId')
  @ApiOperation({ summary: 'Remove menu item from favorites' })
  @ApiContractOk({ description: 'Favorite item removed.', dataSchema: { type: 'object' } })
  removeFavorite(
    @CurrentUser() user: { id: string },
    @Param('menuItemId') menuItemId: string,
  ) {
    return this.usersService.removeFavorite(user.id, menuItemId);
  }
}
