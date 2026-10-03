import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

export interface WsErrorResponse {
  status: 'error';
  code: string;
  message: string;
  timestamp: string;
}

@Catch(WsException)
export class RealtimeWsExceptionFilter extends BaseWsExceptionFilter {
  override catch(exception: WsException, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();
    const err = exception.getError();

    let code = 'WS_ERROR';
    let message = 'WebSocket error occurred';

    if (typeof err === 'string') {
      message = err;
    } else if (typeof err === 'object' && err !== null) {
      const errorRecord = err as Record<string, unknown>;
      code = typeof errorRecord.code === 'string' ? errorRecord.code : 'WS_ERROR';
      message =
        typeof errorRecord.message === 'string'
          ? errorRecord.message
          : message;
    }

    const payload: WsErrorResponse = {
      status: 'error',
      code,
      message,
      timestamp: new Date().toISOString(),
    };

    if (client && typeof client.emit === 'function') {
      client.emit('error', payload);
    }
  }
}
