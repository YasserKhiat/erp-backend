import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type PaginatedPayload = {
  data: unknown;
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  message?: string;
};

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (
          payload instanceof StreamableFile
          || this.isStreamableFileLike(payload)
        ) {
          return payload;
        }

        if (
          payload &&
          typeof payload === 'object' &&
          'success' in (payload as Record<string, unknown>)
        ) {
          return payload;
        }

        if (this.isPaginatedPayload(payload)) {
          return {
            success: true,
            data: payload.data,
            meta: payload.meta,
            ...(payload.message ? { message: payload.message } : {}),
          };
        }

        return {
          success: true,
          data: payload,
        };
      }),
    );
  }

  private isPaginatedPayload(payload: unknown): payload is PaginatedPayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    if (!('data' in candidate) || !('meta' in candidate)) {
      return false;
    }

    const meta = candidate.meta as Record<string, unknown>;
    return (
      !!meta &&
      typeof meta.page === 'number' &&
      typeof meta.limit === 'number' &&
      typeof meta.total === 'number'
    );
  }

  private isStreamableFileLike(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    return (
      typeof candidate.getStream === 'function'
      && typeof candidate.getHeaders === 'function'
    );
  }
}
