import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, ReviewType } from '../common/constants/domain-enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateServiceReviewDto } from './dto/create-service-review.dto';

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
        type: ReviewType.DISH,
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
      where: {
        menuItemId,
        type: ReviewType.DISH,
      },
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
      where: {
        userId,
      },
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

  async createServiceReview(userId: string, dto: CreateServiceReviewDto) {
    const targetOrder = dto.orderId
      ? await this.prisma.order.findUnique({
          where: { id: dto.orderId },
          select: {
            id: true,
            customerId: true,
            status: true,
          },
        })
      : await this.prisma.order.findFirst({
          where: {
            customerId: userId,
            status: OrderStatus.COMPLETED,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            customerId: true,
            status: true,
          },
        });

    if (!targetOrder) {
      throw new NotFoundException('Completed order not found for service review');
    }

    if (targetOrder.customerId !== userId) {
      throw new ForbiddenException();
    }

    if (targetOrder.status !== OrderStatus.COMPLETED) {
      throw new ConflictException('REVIEW_NOT_ELIGIBLE');
    }

    const duplicate = await this.prisma.review.findFirst({
      where: {
        userId,
        orderId: targetOrder.id,
        type: ReviewType.SERVICE,
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      throw new ConflictException('DUPLICATE_REVIEW');
    }

    return this.prisma.review.create({
      data: {
        userId,
        orderId: targetOrder.id,
        type: ReviewType.SERVICE,
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
      },
    });
  }

  getServiceReviews() {
    return this.prisma.review.findMany({
      where: {
        type: ReviewType.SERVICE,
      },
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
}
