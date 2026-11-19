import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Extended Express Request interface carrying correlation identifier.
 */
export interface CorrelatedRequest extends Request {
  id?: string;
  requestId?: string;
}

/**
 * Middleware responsible for request correlation tracking.
 *
 * Extracts incoming `X-Request-Id` header if present, or generates a unique
 * UUID-based identifier. Injects the identifier onto the request object and
 * outgoing response header for distributed tracing and error log correlation.
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  /**
   * Applies request correlation identification.
   *
   * @param {CorrelatedRequest} req - Incoming HTTP request.
   * @param {Response} res - Outgoing HTTP response.
   * @param {NextFunction} next - Express next middleware function.
   * @returns {void}
   */
  use(req: CorrelatedRequest, res: Response, next: NextFunction): void {
    const rawHeader = req.headers['x-request-id'];
    const existingId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const requestId = existingId && existingId.trim().length > 0
      ? existingId.trim()
      : `req_${randomUUID()}`;

    req.id = requestId;
    req.requestId = requestId;

    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
