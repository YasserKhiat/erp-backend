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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { RemoveOrderItemDto } from './dto/remove-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('cart')
  @ApiOperation({ summary: 'Get active cart' })
  @ApiOkResponse({ description: 'Returns current active cart with items.' })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
  getCart(@CurrentUser() user: { id: string }) {
    return this.ordersService.getCart(user.id);
  }

  @Post('cart/items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBody({ type: AddCartItemDto })
  @ApiOkResponse({ description: 'Cart updated with requested item.' })
  addCartItem(@CurrentUser() user: { id: string }, @Body() dto: AddCartItemDto) {
    return this.ordersService.addCartItem(user.id, dto);
  }

  @Post('cart/clear')
  @ApiOperation({ summary: 'Clear active cart' })
  clearCart(@CurrentUser() user: { id: string }) {
    return this.ordersService.clearCart(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Place order from active cart' })
  @ApiBody({ type: PlaceOrderDto })
  @ApiOkResponse({ description: 'Order created from active cart.' })
  placeOrder(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: PlaceOrderDto,
  ) {
    return this.ordersService.placeOrder(user, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get order history of current client' })
  @ApiOkResponse({ description: 'Returns authenticated client order history.' })
  getHistory(@CurrentUser() user: { id: string }) {
    return this.ordersService.getOrderHistory(user.id);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order details and tracking status' })
  @ApiOkResponse({ description: 'Returns order details including items and payments.' })
  getOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.ordersService.getOrder(orderId, user);
  }

  @Get(':orderId/tracking')
  @ApiOperation({ summary: 'Track my order status (client endpoint)' })
  @ApiOkResponse({ description: 'Returns tracking-focused order information.' })
  trackOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.ordersService.trackOrder(orderId, user);
  }

  @Patch(':orderId/status')
  @ApiOperation({ summary: 'Update order status (POS/backoffice)' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiOkResponse({ description: 'Order status updated successfully.' })
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
  @ApiOkResponse({ description: 'Order item quantity updated.' })
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
  @ApiOkResponse({ description: 'Order item removed or decremented.' })
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
