import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, lastValueFrom } from 'rxjs';
import { ExecutionContext, CallHandler, HttpStatus, HttpException, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { Response } from 'express';
import { instanceToPlain } from 'class-transformer';

import { ApiResponse } from '../factories/api-response.factory';
import { EntityApiResponse } from '../dto/entity-api-response.dto';
import { PaginatedApiResponse } from '../dto/paginated-api-response.dto';
import { EmptyApiResponse } from '../dto/empty-api-response.dto';
import { ErrorApiResponse } from '../dto/error-api-response.dto';
import { ApiResponseInterceptor } from '../interceptors/api-response.interceptor';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { UnknownExceptionFilter } from '../filters/unknown-exception.filter';
import { CorrelationMiddleware, CorrelatedRequest } from '@/shared/middleware/correlation.middleware';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';
import { ValidationDomainError, ResourceNotFoundError } from '@/shared/errors';
import { ApiError } from '../types/api-error.type';

describe('Standardized API Response Architecture', () => {
  describe('ApiResponse Factory & DTOs', () => {
    it('creates standard entity response with type entity, excluded on wire', () => {
      const payload = { id: 1, name: 'Vedic Consultation' };
      const response = ApiResponse.ok(payload, { requestId: 'req_abc123' });

      expect(response).toBeInstanceOf(EntityApiResponse);
      expect(response.success).toBe(true);
      expect(response.type).toBe('entity');
      expect(response.data).toEqual(payload);
      expect(response.error).toBeNull();
      expect(response.meta.requestId).toBe('req_abc123');
      expect(new Date(response.meta.timestamp).toISOString()).toBe(response.meta.timestamp);

      const plain = instanceToPlain(response) as Record<string, unknown>;
      expect('type' in plain).toBe(false);
      expect(plain.success).toBe(true);
      expect(plain.data).toEqual(payload);
    });

    it('creates boolean response with type boolean, excluded on wire', () => {
      const response = ApiResponse.ok(true, {
        requestId: 'req_abc123',
        message: 'Profile updated successfully',
      });

      expect(response).toBeInstanceOf(EntityApiResponse);
      expect(response.success).toBe(true);
      expect(response.type).toBe('boolean');
      expect(response.data).toBe(true);
      expect(response.error).toBeNull();
      expect(response.meta.requestId).toBe('req_abc123');
      expect(response.meta.message).toBe('Profile updated successfully');

      const plain = instanceToPlain(response) as Record<string, unknown>;
      expect('type' in plain).toBe(false);
      expect(plain.success).toBe(true);
      expect(plain.data).toBe(true);
    });

    it('creates collection response with type collection, excluded on wire', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = ApiResponse.ok(items, { requestId: 'req_abc123' });

      expect(response).toBeInstanceOf(EntityApiResponse);
      expect(response.success).toBe(true);
      expect(response.type).toBe('collection');
      expect(response.data).toEqual(items);
      expect(response.meta.pagination).toBeUndefined();

      const plain = instanceToPlain(response) as Record<string, unknown>;
      expect('type' in plain).toBe(false);
      expect(plain.success).toBe(true);
      expect(plain.data).toEqual(items);
    });

    it('creates paginated response with type paginated and dual compatibility keys, excluded on wire', () => {
      const items = [{ id: 'prod_123', name: 'Gemstone' }];
      const pagination = {
        page: 1,
        limit: 20,
        totalItems: 120,
        totalPages: 6,
        hasNextPage: true,
        hasPreviousPage: false,
      };

      const response = ApiResponse.paginated(items, pagination, {
        requestId: 'req_abc123',
      });

      expect(response).toBeInstanceOf(PaginatedApiResponse);
      expect(response.success).toBe(true);
      expect(response.type).toBe('paginated');
      expect(response.data).toEqual(items);
      expect(response.meta.pagination.page).toBe(1);
      expect(response.meta.pagination.limit).toBe(20);
      expect(response.meta.pagination.totalItems).toBe(120);
      expect(response.meta.pagination.total).toBe(120);
      expect(response.meta.pagination.hasPreviousPage).toBe(false);
      expect(response.meta.pagination.hasPrevPage).toBe(false);

      const plain = instanceToPlain(response) as Record<string, unknown>;
      expect('type' in plain).toBe(false);
      expect(plain.success).toBe(true);
      expect(plain.data).toEqual(items);
    });

    it('creates empty response with type empty, excluded on wire', () => {
      const response = ApiResponse.empty({ requestId: 'req_abc123' });

      expect(response).toBeInstanceOf(EmptyApiResponse);
      expect(response.success).toBe(true);
      expect(response.type).toBe('empty');
      expect(response.data).toBeNull();
      expect(response.error).toBeNull();
      expect(response.meta.requestId).toBe('req_abc123');

      const plain = instanceToPlain(response) as Record<string, unknown>;
      expect('type' in plain).toBe(false);
      expect(plain.success).toBe(true);
      expect(plain.data).toBeNull();
    });

    it('creates error response with type error, excluded on wire', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: [{ field: 'email', code: 'INVALID_FORMAT', message: 'Bad email' }],
      };

      const response = ApiResponse.fail(error, {
        requestId: 'req_abc123',
        path: '/api/v1/auth',
      });

      expect(response).toBeInstanceOf(ErrorApiResponse);
      expect(response.success).toBe(false);
      expect(response.type).toBe('error');
      expect(response.data).toBeNull();
      expect(response.error).toEqual(error);
      expect(response.meta.requestId).toBe('req_abc123');
      expect(response.meta.path).toBe('/api/v1/auth');

      const plain = instanceToPlain(response) as Record<string, unknown>;
      expect('type' in plain).toBe(false);
      expect(plain.success).toBe(false);
      expect(plain.data).toBeNull();
    });
  });

  describe('CorrelationMiddleware', () => {
    let middleware: CorrelationMiddleware;

    beforeEach(() => {
      middleware = new CorrelationMiddleware();
    });

    it('propagates incoming X-Request-Id header', () => {
      const req = {
        headers: { 'x-request-id': 'custom_client_id_777' },
      } as unknown as CorrelatedRequest;
      const res = {
        setHeader: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      middleware.use(req, res, next);

      expect(req.id).toBe('custom_client_id_777');
      expect(req.requestId).toBe('custom_client_id_777');
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'custom_client_id_777');
      expect(next).toHaveBeenCalled();
    });

    it('generates unique req_ prefix id when incoming header is missing', () => {
      const req = {
        headers: {},
      } as unknown as CorrelatedRequest;
      const res = {
        setHeader: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      middleware.use(req, res, next);

      expect(req.id).toMatch(/^req_/);
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('ApiResponseInterceptor', () => {
    let interceptor: ApiResponseInterceptor<unknown>;

    beforeEach(() => {
      interceptor = new ApiResponseInterceptor();
    });

    function createMockContext(statusCode = 200, reqId = 'req_mock_1'): ExecutionContext {
      const request = {
        id: reqId,
        headers: {},
      };
      const response = {
        statusCode,
        headersSent: false,
        getHeader: vi.fn().mockReturnValue(reqId),
      };

      return {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
      } as unknown as ExecutionContext;
    }

    it('wraps standard entity response into plain wire envelope without type', async () => {
      const context = createMockContext(200, 'req_interceptor_1');
      const handler: CallHandler = {
        handle: () => of({ name: 'Horoscope' }),
      };

      const result = (await lastValueFrom(
        interceptor.intercept(context, handler),
      )) as Record<string, unknown>;

      expect('type' in result).toBe(false);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'Horoscope' });
      expect((result.meta as { requestId: string }).requestId).toBe('req_interceptor_1');
    });

    it('wraps raw boolean into plain wire envelope without type', async () => {
      const context = createMockContext(200, 'req_bool_1');
      const handler: CallHandler = {
        handle: () => of(true),
      };

      const result = (await lastValueFrom(
        interceptor.intercept(context, handler),
      )) as Record<string, unknown>;

      expect('type' in result).toBe(false);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect((result.meta as { requestId: string }).requestId).toBe('req_bool_1');
    });

    it('unwraps legacy BooleanMessage into plain wire envelope without type', async () => {
      const context = createMockContext(200, 'req_legacy_bool');
      const handler: CallHandler = {
        handle: () => of(new BooleanMessage(true, 'Profile saved')),
      };

      const result = (await lastValueFrom(
        interceptor.intercept(context, handler),
      )) as Record<string, unknown>;

      expect('type' in result).toBe(false);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect((result.meta as { message: string }).message).toBe('Profile saved');
    });

    it('unwraps legacy PaginatedResponseDto into plain wire envelope without type', async () => {
      const context = createMockContext(200, 'req_paginated');
      const paginatedDto = PaginatedResponseDto.from([{ id: 10 }], 100, {
        page: 2,
        limit: 10,
      });

      const handler: CallHandler = {
        handle: () => of(paginatedDto),
      };

      const result = (await lastValueFrom(
        interceptor.intercept(context, handler),
      )) as Record<string, unknown>;

      expect('type' in result).toBe(false);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 10 }]);
      const meta = result.meta as { pagination: { page: number; totalItems: number; total: number } };
      expect(meta.pagination.page).toBe(2);
      expect(meta.pagination.totalItems).toBe(100);
      expect(meta.pagination.total).toBe(100);
    });

    it('bypasses HTTP 204 No Content with 0-byte body', async () => {
      const context = createMockContext(HttpStatus.NO_CONTENT);
      const handler: CallHandler = {
        handle: () => of(undefined),
      };

      const result = await lastValueFrom(
        interceptor.intercept(context, handler),
      );

      expect(result).toBeUndefined();
    });

    it('prevents double-wrapping if already an ApiResponse instance and serializes without type', async () => {
      const context = createMockContext(200, 'req_already_wrapped');
      const existing = ApiResponse.ok({ direct: true }, { requestId: 'req_already_wrapped' });
      const handler: CallHandler = {
        handle: () => of(existing),
      };

      const result = (await lastValueFrom(
        interceptor.intercept(context, handler),
      )) as Record<string, unknown>;

      expect(result).toEqual(instanceToPlain(existing));
      expect('type' in result).toBe(false);
    });
  });

  describe('Exception Filters', () => {
    function createMockExceptionHost(reqId = 'req_err_1', path = '/api/v1/test') {
      const responseJson = vi.fn();
      const responseStatus = vi.fn().mockReturnValue({ json: responseJson });

      const request = {
        id: reqId,
        url: path,
        originalUrl: path,
      };

      const response = {
        headersSent: false,
        status: responseStatus,
        getHeader: vi.fn().mockReturnValue(reqId),
      };

      const host = {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
      } as unknown as ExecutionContext;

      return { host, responseStatus, responseJson };
    }

    it('DomainExceptionFilter formats validation and business errors without type on wire', () => {
      const filter = new DomainExceptionFilter();
      const { host, responseStatus, responseJson } = createMockExceptionHost();

      const validationError = new ValidationDomainError({
        email: ['email must be valid'],
        password: ['too short'],
      });

      filter.catch(validationError, host);

      expect(responseStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const payload = responseJson.mock.calls[0][0] as Record<string, unknown>;

      expect('type' in payload).toBe(false);
      expect(payload.success).toBe(false);
      const error = payload.error as ApiError;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual([
        { field: 'email', code: 'INVALID_FIELD', message: 'email must be valid' },
        { field: 'password', code: 'INVALID_FIELD', message: 'too short' },
      ]);
      const meta = payload.meta as { requestId: string; path: string };
      expect(meta.requestId).toBe('req_err_1');
      expect(meta.path).toBe('/api/v1/test');
    });

    it('DomainExceptionFilter formats resource not found error with 404 without type on wire', () => {
      const filter = new DomainExceptionFilter();
      const { host, responseStatus, responseJson } = createMockExceptionHost();

      const notFoundError = new ResourceNotFoundError('Consultation', 'c_123');

      filter.catch(notFoundError, host);

      expect(responseStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      const payload = responseJson.mock.calls[0][0] as Record<string, unknown>;

      expect('type' in payload).toBe(false);
      const error = payload.error as ApiError;
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.message).toContain('Consultation not found');
    });

    it('HttpExceptionFilter maps standard NestJS exceptions without type on wire', () => {
      const filter = new HttpExceptionFilter();
      const { host, responseStatus, responseJson } = createMockExceptionHost();

      const httpEx = new UnauthorizedException('Invalid JWT credentials');

      filter.catch(httpEx, host);

      expect(responseStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      const payload = responseJson.mock.calls[0][0] as Record<string, unknown>;

      expect('type' in payload).toBe(false);
      const error = payload.error as ApiError;
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Invalid JWT credentials');
    });

    it('HttpExceptionFilter maps class-validator array messages without type on wire', () => {
      const filter = new HttpExceptionFilter();
      const { host, responseStatus, responseJson } = createMockExceptionHost();

      const badRequest = new BadRequestException(['name should not be empty', 'age must be positive']);

      filter.catch(badRequest, host);

      expect(responseStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const payload = responseJson.mock.calls[0][0] as Record<string, unknown>;

      expect('type' in payload).toBe(false);
      const error = payload.error as ApiError;
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.details).toEqual([
        { code: 'VALIDATION_ERROR', message: 'name should not be empty' },
        { code: 'VALIDATION_ERROR', message: 'age must be positive' },
      ]);
    });

    it('UnknownExceptionFilter masks internal error details on 500 crashes without type on wire', () => {
      const filter = new UnknownExceptionFilter();
      const { host, responseStatus, responseJson } = createMockExceptionHost();

      const unexpectedError = new Error('FATAL: Database connection string postgresql://admin:secret@db leaked!');

      filter.catch(unexpectedError, host);

      expect(responseStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const payload = responseJson.mock.calls[0][0] as Record<string, unknown>;

      expect('type' in payload).toBe(false);
      expect(payload.success).toBe(false);
      const error = payload.error as ApiError;
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.message).toBe('Internal server error');
      expect(error.details).toBeUndefined();
      expect(error.message).not.toContain('secret');
      const meta = payload.meta as { requestId: string };
      expect(meta.requestId).toBe('req_err_1');
    });

    it('attaches stack in dev mode and strictly omits stack in production', () => {
      const filter = new UnknownExceptionFilter();
      const originalEnv = process.env.NODE_ENV;

      try {
        // Dev mode: stack should be attached
        process.env.NODE_ENV = 'development';
        const { host: devHost, responseJson: devJson } = createMockExceptionHost();
        filter.catch(new Error('Dev test error'), devHost);
        const devPayload = devJson.mock.calls[0][0] as Record<string, unknown>;
        expect('type' in devPayload).toBe(false);
        const devError = devPayload.error as ApiError;
        expect(typeof devError.stack).toBe('string');
        expect(devError.stack).toContain('Dev test error');

        // Production mode: stack should be strictly omitted
        process.env.NODE_ENV = 'production';
        const { host: prodHost, responseJson: prodJson } = createMockExceptionHost();
        filter.catch(new Error('Prod test error'), prodHost);
        const prodPayload = prodJson.mock.calls[0][0] as Record<string, unknown>;
        expect('type' in prodPayload).toBe(false);
        const prodError = prodPayload.error as ApiError;
        expect(prodError.stack).toBeUndefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
