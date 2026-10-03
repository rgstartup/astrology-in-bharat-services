import type {
  AuthenticatedSocketIdentity,
  RealtimeActorType,
} from '../types/socket-auth.types';

export interface IRealtimeAuthVerifier {
  readonly actorType: RealtimeActorType;
  verify(cleanToken: string): Promise<AuthenticatedSocketIdentity | null>;
}

export const REALTIME_AUTH_VERIFIERS = 'REALTIME_AUTH_VERIFIERS';
