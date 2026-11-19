import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { instanceToPlain } from 'class-transformer';
import { ApiResponse } from '../factories/api-response.factory';
import { ApiError } from '../types/api-error.type';
import { CorrelatedRequest } from '@/shared/middleware/correlation.middleware';

/**
 * Catch-all global exception filter handling unhandled runtime errors and crashes.
 * Masks internal implementation details from clients while ensuring full error logging.
 */
@Catch()
export class UnknownExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UnknownExceptionFilter.name);

  /**
   * Catches and normalizes unexpected runtime exceptions.
   *
   * @param {unknown} exception - Caught unexpected exception.
   * @param {ArgumentsHost} host - Execution arguments host.
   * @returns {void}
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      return;
    }

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<CorrelatedRequest>();

    if (res.headersSent) {
      return;
    }

    const requestId =
      req.id ||
      req.requestId ||
      (res.getHeader('X-Request-Id') as string) ||
      '';

    const path = req.originalUrl || req.url || '';

    this.logger.error(
      `Unhandled exception on ${path}: ${
        exception instanceof Error ? exception.message : String(exception)
      }`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const isDev = process.env.NODE_ENV !== 'production';

    const errorPayload: ApiError = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      stack: isDev && exception instanceof Error ? exception.stack : undefined,
    };

    const envelope = ApiResponse.fail(errorPayload, {
      requestId,
      path,
    });

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(instanceToPlain(envelope));
  }
}
