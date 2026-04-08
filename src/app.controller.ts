import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { ApiContractErrors, ApiContractOk } from './common/swagger/api-contract.decorators';

@ApiTags('health')
@ApiContractErrors()
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Service health check',
    description: 'Reports API status and live database connectivity state.',
  })
  @ApiContractOk({
    description: 'Service and database status',
    dataSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'restaurant-erp-backend' },
        database: { type: 'string', example: 'connected' },
        timestamp: { type: 'string', example: '2026-04-08T14:34:58.828Z' },
      },
    },
  })
  async health() {
    let databaseStatus = 'disconnected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch {
      databaseStatus = 'disconnected';
    }

    return {
      status: 'ok',
      service: 'restaurant-erp-backend',
      database: databaseStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
