import { Dispute } from '../../infrastructure/entities/dispute.entity';
import { DisputeNotFoundError } from '../errors/dispute-not-found.error';

export class DisputePolicy {
  static ensureExists(dispute: Dispute | null): asserts dispute is Dispute {
    if (!dispute) {
      throw new DisputeNotFoundError();
    }
  }

  static ensureOwnedBy(dispute: Dispute, userId: string) {
    if (dispute.client_id !== (userId as any)) {
      // In a real app, we might throw a ForbiddenError,
      // but sticking to standard pattern for now
      throw new DisputeNotFoundError();
    }
  }
}
