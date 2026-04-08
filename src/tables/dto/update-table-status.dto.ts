import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TableStatus } from '../../common/constants/domain-enums';

export class UpdateTableStatusDto {
  @ApiProperty({ enum: TableStatus, example: TableStatus.OCCUPIED })
  @IsEnum(TableStatus)
  status: TableStatus;
}
