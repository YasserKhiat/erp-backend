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
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/constants/domain-enums';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiContractErrors, ApiContractOk } from '../common/swagger/api-contract.decorators';
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
import { PersonnelService } from './personnel.service';

@ApiTags('personnel')
@ApiBearerAuth()
@ApiContractErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller()
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @Get('employees')
  @ApiOperation({ summary: 'List employees' })
  @ApiContractOk({ description: 'Employees list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  listEmployees(@Query() query: ListEmployeesQueryDto) {
    return this.personnelService.listEmployees(query);
  }

  @Post('employees')
  @ApiOperation({ summary: 'Create employee profile' })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiContractOk({ description: 'Employee created.', dataSchema: { type: 'object' } })
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.personnelService.createEmployee(dto);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee details' })
  @ApiContractOk({ description: 'Employee details.', dataSchema: { type: 'object' } })
  getEmployee(@Param('id') id: string) {
    return this.personnelService.getEmployee(id);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update employee profile' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiContractOk({ description: 'Employee updated.', dataSchema: { type: 'object' } })
  updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.personnelService.updateEmployee(id, dto);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'List attendance records' })
  @ApiContractOk({ description: 'Attendance records list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  listAttendance(@Query() query: ListAttendanceQueryDto) {
    return this.personnelService.listAttendance(query);
  }

  @Post('attendance')
  @ApiOperation({ summary: 'Create attendance record' })
  @ApiBody({ type: CreateAttendanceDto })
  @ApiContractOk({ description: 'Attendance created.', dataSchema: { type: 'object' } })
  createAttendance(@Body() dto: CreateAttendanceDto) {
    return this.personnelService.createAttendance(dto);
  }

  @Get('absences')
  @ApiOperation({ summary: 'List absence records' })
  @ApiContractOk({ description: 'Absence records list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  listAbsences(@Query() query: ListAbsencesQueryDto) {
    return this.personnelService.listAbsences(query);
  }

  @Post('absences')
  @ApiOperation({ summary: 'Create absence record' })
  @ApiBody({ type: CreateAbsenceDto })
  @ApiContractOk({ description: 'Absence created.', dataSchema: { type: 'object' } })
  createAbsence(@Body() dto: CreateAbsenceDto) {
    return this.personnelService.createAbsence(dto);
  }

  @Get('payroll')
  @ApiOperation({ summary: 'List payroll records' })
  @ApiContractOk({ description: 'Payroll records list.', dataSchema: { type: 'array', items: { type: 'object' } } })
  listPayroll(@Query() query: ListPayrollQueryDto) {
    return this.personnelService.listPayroll(query);
  }

  @Post('payroll/calculate')
  @ApiOperation({ summary: 'Calculate payroll for employee and period' })
  @ApiBody({ type: CalculatePayrollDto })
  @ApiContractOk({ description: 'Payroll calculation.', dataSchema: { type: 'object' } })
  calculatePayroll(@Body() dto: CalculatePayrollDto) {
    return this.personnelService.calculatePayroll(dto);
  }

  @Post('payroll/run')
  @ApiOperation({ summary: 'Create payroll record for employee and period' })
  @ApiBody({ type: RunPayrollDto })
  @ApiContractOk({ description: 'Payroll run created.', dataSchema: { type: 'object' } })
  runPayroll(@Body() dto: RunPayrollDto) {
    return this.personnelService.runPayroll(dto);
  }
}
