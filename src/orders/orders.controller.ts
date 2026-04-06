import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
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
  getCart(@CurrentUser() user: { id: string }) {
    return this.ordersService.getCart(user.id);
  }

  @Post('cart/items')
  @ApiOperation({ summary: 'Add item to cart' })
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
  placeOrder(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: PlaceOrderDto,
  ) {
    return this.ordersService.placeOrder(user, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get order history of current client' })
  getHistory(@CurrentUser() user: { id: string }) {
    return this.ordersService.getOrderHistory(user.id);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order details and tracking status' })
  getOrder(@Param('orderId') orderId: string) {
    return this.ordersService.getOrder(orderId);
  }

  @Patch(':orderId/status')
  @ApiOperation({ summary: 'Update order status (POS/backoffice)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  updateStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(orderId, dto);
  }
}
