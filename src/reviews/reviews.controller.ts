import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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
  getMenuItemReviews(@Param('menuItemId') menuItemId: string) {
    return this.reviewsService.getMenuItemReviews(menuItemId);
  }

  @Get('me')
  @ApiOperation({ summary: 'List my submitted reviews' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  getMyReviews(@CurrentUser() user: { id: string }) {
    return this.reviewsService.getMyReviews(user.id);
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
