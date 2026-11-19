import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { instanceToPlain } from 'class-transformer';
import { ApiResponse } from '../factories/api-response.factory';
import { EntityApiResponse } from '../dto/entity-api-response.dto';
import { PaginatedApiResponse } from '../dto/paginated-api-response.dto';
import { EmptyApiResponse } from '../dto/empty-api-response.dto';
import { ErrorApiResponse } from '../dto/error-api-response.dto';
import { CorrelatedRequest } from '@/shared/middleware/correlation.middleware';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';

/**
 * Global response interceptor unifying all successful HTTP responses into
 * standardized ApiResponse envelope DTOs.
 *
 * Responsibilities:
 * - Wraps entity payloads and collections via `ApiResponse.ok`.
 * - Resolves boolean operations into `data: boolean` (`type: 'boolean'`) with optional messages.
 * - Extracts pagination metadata into `PaginatedApiResponse` (`type: 'paginated'`).
 * - Injects request correlation ID into `meta.requestId`.
 * - Bypasses HTTP 204 No Content responses to maintain strict HTTP semantics.
 * - Prevents double-wrapping using strict `instanceof` checks.
 * - Applies `instanceToPlain` to strip properties marked with `@Exclude()`.
 *
 * @template T - Type of the controller return payload.
 */
@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, unknown>
{
  /**
   * Intercepts execution context and transforms outgoing successful response.
   *
   * @param {ExecutionContext} context - NestJS execution context.
   * @param {CallHandler} next - Call handler for subsequent pipeline steps.
   * @returns {Observable<unknown>}
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<CorrelatedRequest>();

    const requestId =
      request.id ||
      request.requestId ||
      (response.getHeader('X-Request-Id') as string) ||
      '';

    return next.handle().pipe(
      map((data: unknown) => {
        // HTTP 204 No Content must have no response body
        if (response.statusCode === HttpStatus.NO_CONTENT || response.headersSent) {
          return data;
        }

        let envelope: unknown;

        // Prevent double-wrapping if already an envelope DTO instance
        if (
          data instanceof EntityApiResponse ||
          data instanceof PaginatedApiResponse ||
          data instanceof EmptyApiResponse ||
          data instanceof ErrorApiResponse
        ) {
          if (!data.meta.requestId && requestId) {
            data.meta.requestId = requestId;
          }
          envelope = data;
        } else if (data instanceof BooleanMessage) {
          // Handle legacy BooleanMessage DTO instance
          envelope = ApiResponse.ok<boolean>(data.success, {
            requestId,
            message: data.message,
          });
        } else if (typeof data === 'boolean') {
          // Handle direct boolean responses
          envelope = ApiResponse.ok<boolean>(data, { requestId });
        } else if (data instanceof PaginatedResponseDto) {
          // Handle PaginatedResponseDto instance
          envelope = ApiResponse.paginated(data.data, data.meta, {
            requestId,
            message: data.message,
          });
        } else if (data === undefined || data === null) {
          // Void or null payload
          envelope = ApiResponse.empty({ requestId });
        } else {
          // Normal entity or collection payload
          envelope = ApiResponse.ok(data as T, { requestId });
        }

        return instanceToPlain(envelope);
      }),
    );
  }
}
