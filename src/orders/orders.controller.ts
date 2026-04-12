import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginateArray } from '../common/utils/pagination';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { RemoveOrderItemDto } from './dto/remove-order-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  ApiContractErrors,
  ApiContractListOk,
  ApiContractOk,
} from '../common/swagger/api-contract.decorators';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('cart')
  @ApiOperation({ summary: 'Get active cart' })
  @ApiContractOk({ description: 'Current active cart with items.', dataSchema: { type: 'object' } })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
  getCart(@CurrentUser() user: { id: string }) {
    return this.ordersService.getCart(user.id);
  }

  @Post('cart/items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBody({ type: AddCartItemDto })
  @ApiContractOk({ description: 'Cart updated with requested item.', dataSchema: { type: 'object' } })
  addCartItem(@CurrentUser() user: { id: string }, @Body() dto: AddCartItemDto) {
    return this.ordersService.addCartItem(user.id, dto);
  }

  @Post('cart/clear')
  @ApiOperation({ summary: 'Clear active cart' })
  @ApiContractOk({ description: 'Active cart cleared.', dataSchema: { type: 'object' } })
  clearCart(@CurrentUser() user: { id: string }) {
    return this.ordersService.clearCart(user.id);
  }

  @Patch('cart/items/:cartItemId')
  @ApiOperation({ summary: 'Update quantity for one cart item' })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiContractOk({ description: 'Cart item quantity updated.', dataSchema: { type: 'object' } })
  updateCartItem(
    @CurrentUser() user: { id: string },
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.ordersService.updateCartItem(user.id, cartItemId, dto);
  }

  @Delete('cart/items/:cartItemId')
  @ApiOperation({ summary: 'Remove one cart item' })
  @ApiContractOk({ description: 'Cart item removed.', dataSchema: { type: 'object' } })
  removeCartItem(
    @CurrentUser() user: { id: string },
    @Param('cartItemId') cartItemId: string,
  ) {
    return this.ordersService.removeCartItem(user.id, cartItemId);
  }

  @Post()
  @ApiOperation({ summary: 'Place order from active cart' })
  @ApiBody({ type: PlaceOrderDto })
  @ApiContractOk({ description: 'Order created from active cart.', dataSchema: { type: 'object' } })
  placeOrder(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: PlaceOrderDto,
  ) {
    return this.ordersService.placeOrder(user, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get order history of current client' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated authenticated client order history.' })
  getHistory(
    @CurrentUser() user: { id: string },
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.ordersService
      .getOrderHistory(user.id)
      .then((items) => paginateArray(items, pagination));
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order details and tracking status' })
  @ApiContractOk({ description: 'Order details including items and payments.', dataSchema: { type: 'object' } })
  getOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.ordersService.getOrder(orderId, user);
  }

  @Get(':orderId/tracking')
  @ApiOperation({ summary: 'Track my order status (client endpoint)' })
  @ApiContractOk({ description: 'Tracking-focused order information.', dataSchema: { type: 'object' } })
  trackOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.ordersService.trackOrder(orderId, user);
  }

  @Patch(':orderId/status')
  @ApiOperation({ summary: 'Update order status (POS/backoffice)' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiContractOk({ description: 'Order status updated successfully.', dataSchema: { type: 'object' } })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  updateStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(orderId, dto);
  }

  @Patch(':orderId/items/:orderItemId')
  @ApiOperation({ summary: 'Modify quantity of an in-progress order item' })
  @ApiBody({ type: UpdateOrderItemDto })
  @ApiContractOk({ description: 'Order item quantity updated.', dataSchema: { type: 'object' } })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  updateOrderItem(
    @Param('orderId') orderId: string,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.ordersService.updateOrderItem(orderId, orderItemId, dto);
  }

  @Delete(':orderId/items/:orderItemId')
  @ApiOperation({ summary: 'Remove item from an in-progress order' })
  @ApiBody({ type: RemoveOrderItemDto, required: false })
  @ApiContractOk({ description: 'Order item removed or decremented.', dataSchema: { type: 'object' } })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  removeOrderItem(
    @Param('orderId') orderId: string,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: RemoveOrderItemDto,
  ) {
    return this.ordersService.removeOrderItem(orderId, orderItemId, dto);
  }
}
