import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ContractType,
  EmploymentStatus,
} from '../../common/constants/domain-enums';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: 'john.doe@company.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+212600000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Chef de Partie' })
  @IsString()
  position: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  hireDate: string;

  @ApiProperty({ enum: ContractType, example: ContractType.CDI })
  @IsEnum(ContractType)
  contractType: ContractType;

  @ApiPropertyOptional({ enum: EmploymentStatus, example: EmploymentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @ApiProperty({ example: 6500, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseSalary: number;

  @ApiPropertyOptional({ example: 'cm0abc123userid' })
  @IsOptional()
  @IsString()
  userId?: string;
}
