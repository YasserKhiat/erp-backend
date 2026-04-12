import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AbsenceStatus,
  AttendanceStatus,
  ContractType,
  EmploymentStatus,
} from '../common/constants/domain-enums';
import { PrismaService } from '../prisma/prisma.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListAbsencesQueryDto } from './dto/list-absences-query.dto';
import { ListAttendanceQueryDto } from './dto/list-attendance-query.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { ListPayrollQueryDto } from './dto/list-payroll-query.dto';
import { RunPayrollDto } from './dto/run-payroll.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class PersonnelService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultCnssRate = 0.0448;
  private readonly defaultTaxRate = 0.1;

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private parseDateOrThrow(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('INVALID_INPUT');
    }

    return parsed;
  }

  private async getEmployeeOrThrow(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async listEmployees(query: ListEmployeesQueryDto) {
    return this.prisma.employee.findMany({
      where: {
        ...(query.status ? { employmentStatus: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { position: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async createEmployee(dto: CreateEmployeeDto) {
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new BadRequestException('INVALID_INPUT');
      }
    }

    return this.prisma.employee.create({
      data: {
        userId: dto.userId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        position: dto.position,
        hireDate: this.parseDateOrThrow(dto.hireDate),
        employmentStatus: dto.employmentStatus ?? EmploymentStatus.ACTIVE,
        baseSalary: dto.baseSalary,
        contractType: dto.contractType ?? ContractType.CDI,
      },
    });
  }

  async getEmployee(employeeId: string) {
    await this.getEmployeeOrThrow(employeeId);

    return this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        attendances: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        absences: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });
  }

  async updateEmployee(employeeId: string, dto: UpdateEmployeeDto) {
    await this.getEmployeeOrThrow(employeeId);

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });
      if (!user) {
        throw new BadRequestException('INVALID_INPUT');
      }
    }

    return this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(dto.userId !== undefined ? { userId: dto.userId } : {}),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.employmentStatus !== undefined
          ? { employmentStatus: dto.employmentStatus }
          : {}),
        ...(dto.hireDate !== undefined
          ? { hireDate: this.parseDateOrThrow(dto.hireDate) }
          : {}),
        ...(dto.baseSalary !== undefined ? { baseSalary: dto.baseSalary } : {}),
        ...(dto.contractType !== undefined ? { contractType: dto.contractType } : {}),
      },
    });
  }

  async listAttendance(query: ListAttendanceQueryDto) {
    const from = query.from ? this.parseDateOrThrow(query.from) : undefined;
    const to = query.to ? this.parseDateOrThrow(query.to) : undefined;

    return this.prisma.attendance.findMany({
      where: {
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...((from || to)
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        employee: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async createAttendance(dto: CreateAttendanceDto) {
    await this.getEmployeeOrThrow(dto.employeeId);

    const date = this.parseDateOrThrow(dto.date);
    const checkInAt = dto.checkInAt ? this.parseDateOrThrow(dto.checkInAt) : undefined;
    const checkOutAt = dto.checkOutAt ? this.parseDateOrThrow(dto.checkOutAt) : undefined;

    if (checkInAt && checkOutAt && checkInAt >= checkOutAt) {
      throw new BadRequestException('INVALID_INPUT');
    }

    try {
      return await this.prisma.attendance.create({
        data: {
          employeeId: dto.employeeId,
          date,
          checkInAt,
          checkOutAt,
          status: dto.status ?? AttendanceStatus.PRESENT,
          notes: dto.notes,
        },
      });
    } catch {
      throw new ConflictException('RESOURCE_ALREADY_EXISTS');
    }
  }

  async listAbsences(query: ListAbsencesQueryDto) {
    const from = query.from ? this.parseDateOrThrow(query.from) : undefined;
    const to = query.to ? this.parseDateOrThrow(query.to) : undefined;

    return this.prisma.absence.findMany({
      where: {
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...((from || to)
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        employee: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async createAbsence(dto: CreateAbsenceDto) {
    await this.getEmployeeOrThrow(dto.employeeId);

    return this.prisma.absence.create({
      data: {
        employeeId: dto.employeeId,
        date: this.parseDateOrThrow(dto.date),
        reason: dto.reason,
        status: dto.status ?? AbsenceStatus.PENDING,
      },
    });
  }

  async listPayroll(query: ListPayrollQueryDto) {
    const from = query.from ? this.parseDateOrThrow(query.from) : undefined;
    const to = query.to ? this.parseDateOrThrow(query.to) : undefined;

    return this.prisma.payrollRecord.findMany({
      where: {
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...((from || to)
          ? {
              periodStart: {
                ...(from ? { gte: from } : {}),
              },
              periodEnd: {
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        employee: true,
      },
      orderBy: {
        periodStart: 'desc',
      },
    });
  }

  async calculatePayroll(dto: CalculatePayrollDto) {
    const employee = await this.getEmployeeOrThrow(dto.employeeId);

    const periodStart = this.parseDateOrThrow(dto.periodStart);
    const periodEnd = this.parseDateOrThrow(dto.periodEnd);

    if (periodStart > periodEnd) {
      throw new BadRequestException('INVALID_INPUT');
    }

    const grossSalary = Number(employee.baseSalary);
    const cnssRate = dto.cnssRate ?? this.defaultCnssRate;
    const taxRate = dto.taxRate ?? this.defaultTaxRate;
    const otherDeduction = dto.otherDeduction ?? 0;

    const cnssDeduction = this.roundMoney(grossSalary * cnssRate);
    const taxDeduction = this.roundMoney(grossSalary * taxRate);
    const netSalary = this.roundMoney(
      grossSalary - cnssDeduction - taxDeduction - otherDeduction,
    );

    return {
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        position: employee.position,
      },
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      grossSalary: this.roundMoney(grossSalary),
      cnssRate,
      taxRate,
      cnssDeduction,
      taxDeduction,
      otherDeduction: this.roundMoney(otherDeduction),
      netSalary,
    };
  }

  async runPayroll(dto: RunPayrollDto) {
    const calculated = await this.calculatePayroll(dto);

    const existing = await this.prisma.payrollRecord.findUnique({
      where: {
        employeeId_periodStart_periodEnd: {
          employeeId: dto.employeeId,
          periodStart: this.parseDateOrThrow(dto.periodStart),
          periodEnd: this.parseDateOrThrow(dto.periodEnd),
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('RESOURCE_ALREADY_EXISTS');
    }

    return this.prisma.payrollRecord.create({
      data: {
        employeeId: dto.employeeId,
        periodStart: this.parseDateOrThrow(dto.periodStart),
        periodEnd: this.parseDateOrThrow(dto.periodEnd),
        grossSalary: calculated.grossSalary,
        cnssDeduction: calculated.cnssDeduction,
        taxDeduction: calculated.taxDeduction,
        otherDeduction: calculated.otherDeduction,
        netSalary: calculated.netSalary,
        notes: dto.notes,
      },
      include: {
        employee: true,
      },
    });
  }
}
