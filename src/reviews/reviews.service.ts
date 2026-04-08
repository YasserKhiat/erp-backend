import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '../common/constants/domain-enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException();
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new ConflictException('REVIEW_NOT_ELIGIBLE');
    }

    const orderItem = order.items.find((item) => item.id === dto.orderItemId);
    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    if (orderItem.menuItemId !== dto.menuItemId) {
      throw new ConflictException('INVALID_REVIEW_LINK');
    }

    const duplicate = await this.prisma.review.findUnique({
      where: {
        userId_orderItemId: {
          userId,
          orderItemId: dto.orderItemId,
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('DUPLICATE_REVIEW');
    }

    return this.prisma.review.create({
      data: {
        userId,
        orderId: dto.orderId,
        orderItemId: dto.orderItemId,
        menuItemId: dto.menuItemId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
        menuItem: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  getMenuItemReviews(menuItemId: string) {
    return this.prisma.review.findMany({
      where: { menuItemId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  getMyReviews(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
