import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorPayload = isHttpException ? exception.getResponse() : null;
    const { error, message } = this.buildErrorContract(status, errorPayload);

    response.status(status).json({
      success: false,
      error,
      message,
    });
  }

  private buildErrorContract(status: number, payload: unknown) {
    if (typeof payload === 'string') {
      return {
        error: this.statusToErrorCode(status),
        message: payload,
      };
    }

    if (payload && typeof payload === 'object') {
      const raw = payload as Record<string, unknown>;
      const rawMessage = raw.message;

      if (Array.isArray(rawMessage) && rawMessage.length > 0) {
        return {
          error: 'VALIDATION_ERROR',
          message: String(rawMessage[0]),
        };
      }

      if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
        const isDomainCode = /^[A-Z0-9_]+$/.test(rawMessage);
        return {
          error: isDomainCode
            ? rawMessage
            : this.statusToErrorCode(status),
          message: isDomainCode ? this.humanize(rawMessage) : rawMessage,
        };
      }
    }

    return {
      error: this.statusToErrorCode(status),
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : this.humanize(this.statusToErrorCode(status)),
    };
  }

  private statusToErrorCode(status: number): string {
    const map: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
    };

    return map[status] ?? 'INTERNAL_SERVER_ERROR';
  }

  private humanize(code: string): string {
    return code
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
