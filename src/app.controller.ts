import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { ApiContractErrors, ApiContractOk } from './common/swagger/api-contract.decorators';

@ApiTags('health')
@ApiContractErrors()
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Service entrypoint',
    description: 'Provides quick links to API documentation and health check.',
  })
  @ApiContractOk({
    description: 'Service entrypoint metadata',
    dataSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        service: { type: 'string', example: 'restaurant-erp-backend' },
        message: { type: 'string', example: 'API is running' },
        docs: { type: 'string', example: '/docs' },
        health: { type: 'string', example: '/health' },
      },
    },
  })
  root() {
    return {
      success: true,
      service: 'restaurant-erp-backend',
      message: 'API is running',
      docs: '/docs',
      health: '/health',
    };
  }

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
