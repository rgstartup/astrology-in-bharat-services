import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { instanceToPlain } from 'class-transformer';
import { DomainError } from '@/shared/errors/domain.error';
import { ApiResponse } from '../factories/api-response.factory';
import { ApiError, ApiErrorDetail } from '../types/api-error.type';
import { CorrelatedRequest } from '@/shared/middleware/correlation.middleware';

/**
 * Exception filter handling domain / business rule failures.
 * Normalizes DomainError instances into standardized ErrorApiResponse envelopes.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  /**
   * Catches and formats DomainError instances.
   *
   * @param {DomainError} exception - Caught domain error.
   * @param {ArgumentsHost} host - Execution arguments host.
   * @returns {void}
   */
  catch(exception: DomainError, host: ArgumentsHost): void {
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

    let details: ApiErrorDetail[] | undefined;
    if (exception.fieldErrors && typeof exception.fieldErrors === 'object') {
      details = Object.entries(exception.fieldErrors).flatMap(
        ([field, messages]) =>
          messages.map((message) => ({
            field,
            code: 'INVALID_FIELD',
            message,
          })),
      );
    }

    const isDev = process.env.NODE_ENV !== 'production';

    const errorPayload: ApiError = {
      code: exception.code,
      message: exception.message,
      details,
      stack: isDev ? exception.stack : undefined,
    };

    const envelope = ApiResponse.fail(errorPayload, {
      requestId,
      path,
    });

    res.status(exception.httpStatus).json(instanceToPlain(envelope));
  }
}
