import { Injectable, Logger } from '@nestjs/common';

type AuditPayload = {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger('AuditLog');

  log(payload: AuditPayload) {
    this.logger.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: payload.userId ?? null,
        action: payload.action,
        entity: payload.entity ?? null,
        entityId: payload.entityId ?? null,
        metadata: payload.metadata ?? null,
      }),
    );
  }
}
