# Cookie Helper Functions

This file provides cookie configuration for the auth module.

## Functions

### `getAccessTokenCookieOptions()`

Returns cookie options for the access token.

**Settings:**

- `httpOnly: true` – Cannot be accessed via JavaScript
- `secure: true (in production)` – Will only be sent over HTTPS
- `sameSite: 'strict'` – CSRF protection
- `maxAge: 15 minutes` – Expires after 15 minutes

### `getRefreshTokenCookieOptions()`

Returns cookie options for the refresh token.

**Settings:**

- `httpOnly: true` – Cannot be accessed via JavaScript
- `secure: true (in production)` – Will only be sent over HTTPS
- `sameSite: 'strict'` – CSRF protection
- `maxAge: 7 days` – Expires after 7 days

### `COOKIE_NAMES`

Constants for cookie names:

- `ACCESS_TOKEN`: 'accessToken'
- `REFRESH_TOKEN`: 'refreshToken'

## Usage Example

```typescript
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  COOKIE_NAMES,
} from './cookie.helper';

// Set access token cookie
res.cookie(COOKIE_NAMES.ACCESS_TOKEN, token, getAccessTokenCookieOptions());

// Set refresh token cookie
res.cookie(
  COOKIE_NAMES.REFRESH_TOKEN,
  refreshToken,
  getRefreshTokenCookieOptions(),
);

// Clear cookies
res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN);
res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN);
```
