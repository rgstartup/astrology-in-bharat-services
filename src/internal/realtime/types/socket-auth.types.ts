export type RealtimeActorType = 'client' | 'expert';

export interface BaseSocketIdentity {
  actorType: RealtimeActorType;
  id: number;
  email: string;
}

export interface ClientSocketIdentity extends BaseSocketIdentity {
  actorType: 'client';
  clientId: number;
}

export interface ExpertSocketIdentity extends BaseSocketIdentity {
  actorType: 'expert';
  expertId: number;
}

export type AuthenticatedSocketIdentity =
  | ClientSocketIdentity
  | ExpertSocketIdentity;
