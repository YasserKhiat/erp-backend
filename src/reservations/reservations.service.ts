import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationStatus, UserRole } from '../common/constants/domain-enums';
import { ReservationCreatedEvent } from '../orders/events';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto';
import { ReservationAvailabilityQueryDto } from './dto/reservation-availability-query.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private readonly activeStatuses: ReservationStatus[] = [
    ReservationStatus.PENDING,
    ReservationStatus.CONFIRMED,
    ReservationStatus.SEATED,
  ];

  private assertValidTimeRange(startAt: Date, endAt: Date) {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('INVALID_INPUT');
    }

    if (startAt >= endAt) {
      throw new BadRequestException('INVALID_INPUT');
    }

    if (startAt < new Date()) {
      throw new ConflictException('INVALID_RESERVATION_STATUS');
    }
  }

  private async assertTableCapacity(tableId: string, guestCount: number) {
    const table = await this.prisma.diningTable.findUnique({
      where: { id: tableId },
      select: { id: true, seats: true },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (guestCount > table.seats) {
      throw new ConflictException('TABLE_CAPACITY_EXCEEDED');
    }
  }

  private async assertNoReservationConflict(
    tableId: string,
    startAt: Date,
    endAt: Date,
    excludeReservationId?: string,
  ) {
    const conflicting = await this.prisma.reservation.count({
      where: {
        tableId,
        status: { in: this.activeStatuses },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeReservationId
          ? {
              id: {
                not: excludeReservationId,
              },
            }
          : {}),
      },
    });

    if (conflicting > 0) {
      throw new ConflictException('RESERVATION_SLOT_CONFLICT');
    }
  }

  private async getReservationForActor(
    reservationId: string,
    actor: { id: string; role: UserRole },
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        table: true,
        user: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (actor.role === UserRole.CLIENT && reservation.userId !== actor.id) {
      throw new ForbiddenException();
    }

    return reservation;
  }

  private canModify(status: ReservationStatus): boolean {
    return (
      status === ReservationStatus.PENDING || status === ReservationStatus.CONFIRMED
    );
  }

  private getStatusTransitions(status: ReservationStatus): ReservationStatus[] {
    const transitions: Record<ReservationStatus, ReservationStatus[]> = {
      PENDING: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
      CONFIRMED: [
        ReservationStatus.SEATED,
        ReservationStatus.CANCELLED,
        ReservationStatus.NO_SHOW,
      ],
      SEATED: [ReservationStatus.COMPLETED],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    return transitions[status] ?? [];
  }

  async createReservation(
    actor: { id: string; role: UserRole },
    dto: CreateReservationDto,
  ) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    this.assertValidTimeRange(startAt, endAt);
    await this.assertTableCapacity(dto.tableId, dto.guestCount);
    await this.assertNoReservationConflict(dto.tableId, startAt, endAt);

    const reservation = await this.prisma.reservation.create({
      data: {
        userId: actor.role === UserRole.CLIENT ? actor.id : undefined,
        tableId: dto.tableId,
        guestCount: dto.guestCount,
        startAt,
        endAt,
        notes: dto.notes,
        status: ReservationStatus.CONFIRMED,
      },
      include: {
        table: true,
        user: true,
      },
    });

    this.logger.log(`Emitting reservation.created for reservation ${reservation.id}`);
    this.eventEmitter.emit('reservation.created', {
      reservation: {
        id: reservation.id,
        userId: reservation.userId ?? undefined,
        tableId: reservation.tableId,
        guestCount: reservation.guestCount,
        startAt: reservation.startAt.toISOString(),
        endAt: reservation.endAt.toISOString(),
      },
    } as ReservationCreatedEvent);

    return reservation;
  }

  getMyReservations(userId: string) {
    return this.prisma.reservation.findMany({
      where: { userId },
      include: {
        table: true,
      },
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  listReservations(filters: ListReservationsQueryDto) {
    return this.prisma.reservation.findMany({
      where: {
        ...(filters.tableId ? { tableId: filters.tableId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...((filters.from || filters.to)
          ? {
              startAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        table: true,
        user: true,
      },
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async getAvailability(query: ReservationAvailabilityQueryDto) {
    const startAt = new Date(query.startAt);
    const endAt = new Date(query.endAt);

    this.assertValidTimeRange(startAt, endAt);

    const tables = await this.prisma.diningTable.findMany({
      where: {
        seats: { gte: query.guestCount },
        reservations: {
          none: {
            status: { in: this.activeStatuses },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        },
      },
      orderBy: {
        seats: 'asc',
      },
      select: {
        id: true,
        code: true,
        seats: true,
      },
    });

    return {
      requestedRange: {
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
      guestCount: query.guestCount,
      availableTables: tables,
    };
  }

  async updateReservation(
    reservationId: string,
    actor: { id: string; role: UserRole },
    dto: UpdateReservationDto,
  ) {
    const reservation = await this.getReservationForActor(reservationId, actor);

    if (!this.canModify(reservation.status as ReservationStatus)) {
      throw new ConflictException('INVALID_RESERVATION_STATUS');
    }

    const tableId = dto.tableId ?? reservation.tableId;
    const guestCount = dto.guestCount ?? reservation.guestCount;
    const startAt = dto.startAt ? new Date(dto.startAt) : reservation.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : reservation.endAt;

    this.assertValidTimeRange(startAt, endAt);
    await this.assertTableCapacity(tableId, guestCount);
    await this.assertNoReservationConflict(tableId, startAt, endAt, reservationId);

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        tableId,
        guestCount,
        startAt,
        endAt,
        notes: dto.notes ?? reservation.notes,
      },
      include: {
        table: true,
        user: true,
      },
    });
  }

  async cancelReservation(
    reservationId: string,
    actor: { id: string; role: UserRole },
  ) {
    const reservation = await this.getReservationForActor(reservationId, actor);

    if (!this.canModify(reservation.status as ReservationStatus)) {
      throw new ConflictException('INVALID_RESERVATION_STATUS');
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        table: true,
        user: true,
      },
    });
  }

  async updateReservationStatus(
    reservationId: string,
    dto: UpdateReservationStatusDto,
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const allowed = this.getStatusTransitions(
      reservation.status as ReservationStatus,
    );

    if (!allowed.includes(dto.status)) {
      throw new ConflictException('INVALID_RESERVATION_STATUS');
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: dto.status,
        ...(dto.status === ReservationStatus.CANCELLED
          ? { cancelledAt: new Date() }
          : {}),
      },
      include: {
        table: true,
        user: true,
      },
    });
  }
}
