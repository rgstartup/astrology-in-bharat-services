import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { instanceToPlain } from 'class-transformer';
import { ApiResponse } from '../factories/api-response.factory';
import { ApiError, ApiErrorDetail } from '../types/api-error.type';
import { CorrelatedRequest } from '@/shared/middleware/correlation.middleware';

/**
 * Maps standard HTTP status codes to machine-readable error codes.
 *
 * @param {number} status - HTTP status code.
 * @returns {string} Machine-readable error code.
 */
function defaultCodeFromStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'UNPROCESSABLE_ENTITY';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'HTTP_ERROR';
  }
}

/**
 * Exception filter handling NestJS HttpException instances.
 * Formats client mistakes, validation rejections, and HTTP errors into ErrorApiResponse.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Catches and formats HttpException instances.
   *
   * @param {HttpException} exception - Caught HTTP exception.
   * @param {ArgumentsHost} host - Execution arguments host.
   * @returns {void}
   */
  catch(exception: HttpException, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<CorrelatedRequest>();

    if (response.headersSent) {
      return;
    }

    const requestId =
      request.id ||
      request.requestId ||
      (response.getHeader('X-Request-Id') as string) ||
      '';

    const path = request.originalUrl || request.url || '';
    const status = exception.getStatus();
    const res = exception.getResponse();

    let code = defaultCodeFromStatus(status);
    let message = exception.message || 'HTTP error';
    let details: ApiErrorDetail[] | undefined;

    if (typeof res === 'object' && res !== null) {
      const body = res as Record<string, unknown>;
      const rawCode =
        (body['errorCode'] as string) ||
        (body['error'] as string) ||
        defaultCodeFromStatus(status);

      code = rawCode.toUpperCase().replace(/\s+/g, '_');

      if (Array.isArray(body['message'])) {
        message = 'The provided information is invalid.';
        details = (body['message'] as string[]).map((msg) => ({
          code: 'VALIDATION_ERROR',
          message: msg,
        }));
      } else if (typeof body['message'] === 'string') {
        message = body['message'];
      }

      if (body['fieldErrors'] && typeof body['fieldErrors'] === 'object') {
        details = Object.entries(
          body['fieldErrors'] as Record<string, string[]>,
        ).flatMap(([field, msgs]) =>
          msgs.map((msg) => ({
            field,
            code: 'INVALID_FIELD',
            message: msg,
          })),
        );
      } else if (Array.isArray(body['details'])) {
        details = body['details'] as ApiErrorDetail[];
      }
    } else if (typeof res === 'string') {
      message = res;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `HttpException ${status} on ${path}: ${exception.message}`,
        exception.stack,
      );
      message = 'Internal server error';
      code = 'INTERNAL_SERVER_ERROR';
      details = undefined;
    }

    const isDev = process.env.NODE_ENV !== 'production';

    const errorPayload: ApiError = {
      code,
      message,
      details,
      stack: isDev ? exception.stack : undefined,
    };

    const envelope = ApiResponse.fail(errorPayload, {
      requestId,
      path,
    });

    response.status(status).json(instanceToPlain(envelope));
  }
}
