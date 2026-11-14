import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../errors/domain.error';
import { ApiResponse } from '../dto/api-response.dto';
import { ApiError } from '../dto/api-response.dto';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    res.status(exception.httpStatus).json(
      ApiResponse.fail(
        new ApiError({
          code: exception.code,
          message: exception.message,
          details: exception.fieldErrors,
          path: req.url,
          timestamp: new Date().toISOString(),
        }),
      ),
    );
  }
}