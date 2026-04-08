import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginateArray } from '../common/utils/pagination';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('menu/:menuItemId')
  @ApiOperation({ summary: 'List reviews for a menu item' })
  @ApiParam({ name: 'menuItemId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getMenuItemReviews(
    @Param('menuItemId') menuItemId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.reviewsService
      .getMenuItemReviews(menuItemId)
      .then((items) => paginateArray(items, pagination));
  }

  @Get('me')
  @ApiOperation({ summary: 'List my submitted reviews' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  getMyReviews(
    @CurrentUser() user: { id: string },
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.reviewsService
      .getMyReviews(user.id)
      .then((items) => paginateArray(items, pagination));
  }

  @Post()
  @ApiOperation({ summary: 'Create a review for a completed order item' })
  @ApiBody({ type: CreateReviewDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  createReview(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, dto);
  }
}
