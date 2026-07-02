import { TokenAlreadyUsedError } from '../errors/token-already-used.error';

export class LoginWithMagicLinkPolicy {
  static ensureTokenIsUnused(isTokenUsed: boolean) {
    if (isTokenUsed) {
      throw new TokenAlreadyUsedError();
    }
  }
}
