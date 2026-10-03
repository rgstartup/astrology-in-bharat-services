import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  REALTIME_AUTH_VERIFIERS,
  type IRealtimeAuthVerifier,
} from '../contracts/realtime-auth-verifier.contract';
import type {
  AuthenticatedSocketIdentity,
  RealtimeActorType,
} from '../types/socket-auth.types';

@Injectable()
export class RealtimeAuthService {
  private readonly logger = new Logger(RealtimeAuthService.name);
  private readonly verifiers: Map<RealtimeActorType, IRealtimeAuthVerifier> =
    new Map();

  constructor(
    @Optional()
    @Inject(REALTIME_AUTH_VERIFIERS)
    injectedVerifiers?: IRealtimeAuthVerifier[],
  ) {
    if (Array.isArray(injectedVerifiers)) {
      for (const verifier of injectedVerifiers) {
        this.registerVerifier(verifier);
      }
    }
  }

  registerVerifier(verifier: IRealtimeAuthVerifier): void {
    this.verifiers.set(verifier.actorType, verifier);
  }

  async authenticate(
    token: string,
    actorHint?: RealtimeActorType,
  ): Promise<AuthenticatedSocketIdentity | null> {
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) {
      return null;
    }

    if (actorHint) {
      const verifier = this.verifiers.get(actorHint);
      if (verifier) {
        return verifier.verify(cleanToken);
      }
    }

    for (const verifier of this.verifiers.values()) {
      try {
        const identity = await verifier.verify(cleanToken);
        if (identity) {
          return identity;
        }
      } catch (err) {
        this.logger.debug(
          `Verifier ${verifier.actorType} failed: ${(err as Error).message}`,
        );
      }
    }

    return null;
  }
}
