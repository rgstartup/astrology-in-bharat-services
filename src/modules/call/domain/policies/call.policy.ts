import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import {
  CallSession,
  CallSessionStatus,
} from '../../infrastructure/entities/call-session.entity';
import {
  CallExpertNotFoundError,
  CallExpertUnavailableError,
  CallInsufficientBalanceError,
  CallSessionAccessDeniedError,
  CallSessionInvalidStatusError,
  CallSessionNotFoundError,
} from '../errors/call.errors';

export class CallPolicy {
  static ensureExpertExists(
    expert: ProfileExpert | null,
  ): asserts expert is ProfileExpert {
    if (!expert) {
      throw new CallExpertNotFoundError();
    }
  }

  static ensureExpertAvailable(isAvailable: boolean) {
    if (!isAvailable) {
      throw new CallExpertUnavailableError();
    }
  }

  static ensureSufficientBalance(
    hasBalance: boolean,
    minMinutes: number,
    minBalanceRequired: number,
    type: string,
  ) {
    if (!hasBalance) {
      throw new CallInsufficientBalanceError(
        minMinutes,
        minBalanceRequired,
        type,
      );
    }
  }

  static ensureSessionExists(
    session: CallSession | null,
  ): asserts session is CallSession {
    if (!session) {
      throw new CallSessionNotFoundError();
    }
  }

  static ensureExpertAssignedToSession(
    assignedExpertUserId: number,
    currentExpertId: number,
  ) {
    if (assignedExpertUserId !== currentExpertId) {
      throw new CallSessionAccessDeniedError();
    }
  }

  static ensureSessionCanBeAccepted(status: CallSessionStatus) {
    if (status !== CallSessionStatus.PENDING) {
      throw new CallSessionInvalidStatusError(status);
    }
  }
}
