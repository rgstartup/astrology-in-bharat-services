import { SessionExpiredError } from '../errors/session-expired.error';

export class RefreshTokenPolicy {
  static ensureSessionIsActive(isSessionActive: boolean) {
    if (!isSessionActive) {
      throw new SessionExpiredError();
    }
  }
}
