// src/common/filters/unknown-exception.filter.ts
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';

@Catch()
export class UnknownExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // 🔴 Log aggressively (replace with Winston/Sentry/etc)
    console.error('Unhandled exception:', exception);
    try {
      fs.appendFileSync('unhandled-errors.log', new Date().toISOString() + '\n' + String(exception) + '\n' + ((exception as Error)?.stack || '') + '\n\n');
    } catch (e) {}

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
