import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    const maxRetries = this.getPositiveIntFromEnv(
      process.env.PRISMA_CONNECT_MAX_RETRIES,
      12,
    );
    const retryDelayMs = this.getPositiveIntFromEnv(
      process.env.PRISMA_CONNECT_RETRY_DELAY_MS,
      2000,
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connection established');
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          this.logger.error('Database connection failed during startup');
          throw error;
        }

        this.logger.warn(
          `Database not ready yet (attempt ${attempt}/${maxRetries}), retrying in ${retryDelayMs}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  private getPositiveIntFromEnv(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
