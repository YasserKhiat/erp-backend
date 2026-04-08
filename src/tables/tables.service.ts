import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TableStatus, UserRole } from '../common/constants/domain-enums';
import { AssignWaiterDto } from './dto/assign-waiter.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  createTable(dto: CreateTableDto) {
    return this.prisma.diningTable.create({
      data: {
        code: dto.code,
        seats: dto.seats,
        assignedWaiterId: dto.assignedWaiterId,
      },
      include: {
        assignedWaiter: true,
      },
    });
  }

  listTables() {
    return this.prisma.diningTable.findMany({
      include: {
        assignedWaiter: true,
      },
      orderBy: {
        code: 'asc',
      },
    });
  }

  async getTableById(tableId: string) {
    const table = await this.prisma.diningTable.findUnique({
      where: { id: tableId },
      include: { assignedWaiter: true },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async updateStatus(tableId: string, dto: UpdateTableStatusDto) {
    await this.getTableById(tableId);

    return this.prisma.diningTable.update({
      where: { id: tableId },
      data: { status: dto.status },
      include: { assignedWaiter: true },
    });
  }

  async assignWaiter(tableId: string, dto: AssignWaiterDto) {
    await this.getTableById(tableId);

    if (dto.waiterId) {
      const waiter = await this.prisma.user.findUnique({
        where: { id: dto.waiterId },
      });

      if (!waiter) {
        throw new NotFoundException('Assigned waiter not found');
      }

      if (
        waiter.role !== UserRole.EMPLOYEE &&
        waiter.role !== UserRole.MANAGER &&
        waiter.role !== UserRole.ADMIN
      ) {
        throw new BadRequestException('Assigned user is not staff');
      }
    }

    return this.prisma.diningTable.update({
      where: { id: tableId },
      data: {
        assignedWaiterId: dto.waiterId ?? null,
      },
      include: { assignedWaiter: true },
    });
  }

  async markAvailable(tableId: string) {
    await this.getTableById(tableId);

    return this.prisma.diningTable.update({
      where: { id: tableId },
      data: { status: TableStatus.AVAILABLE },
    });
  }
}
