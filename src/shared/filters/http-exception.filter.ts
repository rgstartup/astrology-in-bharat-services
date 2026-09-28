// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const res = exception.getResponse();
    const stack = exception.stack;

    if (
      status === HttpStatus.PAYLOAD_TOO_LARGE ||
      status === HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      try {
        fs.appendFileSync(
          'http-errors.log',
          `${new Date().toISOString()} | ${status} | ${request.url}\n${stack}\nFull Exception: ${JSON.stringify(exception, Object.getOwnPropertyNames(exception || {}))}\n\n`,
        );
      } catch (e) {
        this.logger.error('Failed to write to log file', e);
      }
    }

    if (response.headersSent) {
      return;
    }

    const errorBody =
      typeof res === 'object' && res !== null
        ? (res as Record<string, unknown>)
        : { message: res };

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...errorBody,
      ...(process.env.NODE_ENV === 'development' && { stack }),
    });
  }
}

