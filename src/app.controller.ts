import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Service health check',
    description: 'Reports API status and live database connectivity state.',
  })
  @ApiOkResponse({
    description: 'Service and database status',
    schema: {
      example: {
        status: 'ok',
        service: 'restaurant-erp-backend',
        database: 'connected',
        timestamp: '2026-04-08T14:34:58.828Z',
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
