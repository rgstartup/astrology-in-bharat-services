import type { Socket } from 'socket.io';
import type { AuthenticatedSocketIdentity } from './socket-auth.types';

export interface RealtimeSocketData {
  auth: AuthenticatedSocketIdentity | null;
}

export type RealtimeSocket = Socket<
  Record<string, any>,
  Record<string, any>,
  Record<string, any>,
  RealtimeSocketData
>;
