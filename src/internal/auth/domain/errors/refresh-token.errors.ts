import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@/shared/errors/domain.error';

/**
 * Thrown when a refresh token reuse / replay attack is detected outside the grace window.
 */
export class TokenReuseDetectedError extends DomainError {
  readonly code = 'AUTH_TOKEN_REUSE_DETECTED';
  readonly message = 'Token reuse detected';
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}

/**
 * Thrown when a refresh token is structurally invalid, unknown, or not found.
 */
export class InvalidRefreshTokenError extends DomainError {
  readonly code = 'AUTH_REFRESH_TOKEN_INVALID';
  readonly message = 'Invalid refresh token';
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}

/**
 * Thrown when a refresh session has expired or has been revoked.
 */
export class RefreshSessionExpiredOrRevokedError extends DomainError {
  readonly code = 'AUTH_SESSION_EXPIRED_OR_REVOKED';
  readonly message = 'Invalid or expired refresh token';
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}

/**
 * Thrown when attempting to authenticate or refresh tokens with a suspended account.
 */
export class AccountSuspendedError extends DomainError {
  readonly code = 'AUTH_ACCOUNT_SUSPENDED';
  readonly message = 'Your account has been suspended';
  readonly httpStatus = HttpStatus.FORBIDDEN;
}
