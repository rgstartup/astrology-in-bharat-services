import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '@/common/types/domain.error';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    res.status(exception.httpStatus).json({
      statusCode: exception.httpStatus,
      errorCode: exception.code,
      message: exception.message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
