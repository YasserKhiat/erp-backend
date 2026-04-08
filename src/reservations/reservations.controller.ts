import {
  Body,
  Controller,
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
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginateArray } from '../common/utils/pagination';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto';
import { ReservationAvailabilityQueryDto } from './dto/reservation-availability-query.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import {
  ApiContractErrors,
  ApiContractListOk,
  ApiContractOk,
} from '../common/swagger/api-contract.decorators';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create reservation' })
  @ApiBody({ type: CreateReservationDto })
  @ApiContractOk({ description: 'Reservation created.', dataSchema: { type: 'object' } })
  @Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  createReservation(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.createReservation(user, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'List my reservations' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated client reservations list.' })
  @Roles(UserRole.CLIENT)
  getMyReservations(
    @CurrentUser() user: { id: string },
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.reservationsService
      .getMyReservations(user.id)
      .then((items) => paginateArray(items, pagination));
  }

  @Get('availability')
  @ApiOperation({ summary: 'Get available tables for a reservation slot' })
  @ApiQuery({ name: 'startAt', required: true, type: String })
  @ApiQuery({ name: 'endAt', required: true, type: String })
  @ApiQuery({ name: 'guestCount', required: true, type: Number })
  @ApiContractOk({ description: 'Reservation availability details.', dataSchema: { type: 'object' } })
  @Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  getAvailability(@Query() query: ReservationAvailabilityQueryDto) {
    return this.reservationsService.getAvailability(query);
  }

  @Get()
  @ApiOperation({ summary: 'List reservations (backoffice)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiContractListOk({ description: 'Paginated reservations list for backoffice.' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  listReservations(@Query() query: ListReservationsQueryDto) {
    return this.reservationsService
      .listReservations(query)
      .then((items) => paginateArray(items, query));
  }

  @Patch(':reservationId')
  @ApiOperation({ summary: 'Modify reservation' })
  @ApiBody({ type: UpdateReservationDto })
  @ApiContractOk({ description: 'Reservation updated.', dataSchema: { type: 'object' } })
  @Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  updateReservation(
    @Param('reservationId') reservationId: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservationsService.updateReservation(reservationId, user, dto);
  }

  @Patch(':reservationId/cancel')
  @ApiOperation({ summary: 'Cancel reservation' })
  @ApiContractOk({ description: 'Reservation cancelled.', dataSchema: { type: 'object' } })
  @Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  cancelReservation(
    @Param('reservationId') reservationId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.reservationsService.cancelReservation(reservationId, user);
  }

  @Patch(':reservationId/status')
  @ApiOperation({ summary: 'Update reservation status (backoffice)' })
  @ApiBody({ type: UpdateReservationStatusDto })
  @ApiContractOk({ description: 'Reservation status updated.', dataSchema: { type: 'object' } })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  updateStatus(
    @Param('reservationId') reservationId: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.reservationsService.updateReservationStatus(reservationId, dto);
  }
}
