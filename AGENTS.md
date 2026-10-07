# Import alias rule

`@/*` maps to `./src/*` (see `tsconfig.json` `paths`).

- MUST use `@/` whenever it shortens the import path — i.e. any import
  that would otherwise need `../../` or deeper to reach another module
  (e.g. `@/shared/...`, `@/internal/...`, `@/external/...`, `@/core/...`,
  `@/config/...`).
- Single-level `../` is allowed ONLY within the same feature folder where
  it is already the shortest form (e.g. `../account.service`,
  `../dto/request/account.dto`, `../account.mapper` from a sibling
  `controllers/` or `use-cases/` directory). Prefer `./` for same-directory
  / child paths (e.g. `./account.service`, `./entities/account.entity`).
- NEVER introduce new `../../` (or deeper) parent-traversal imports. When
  touching a file, convert eligible existing deep `../` imports to `@/`
  in the same change.

```ts
// Good
import { IExpert } from '@/shared/types/access-token.payload';
import { Media } from '@/internal/media/entities/media.entity';
import { GetExpertAccountUseCase } from './use-cases/get-account.usecase';

// Bad
import { IExpert } from '../../../../shared/types/access-token.payload';
import { Media } from '../../internal/media/entities/media.entity';
```

# Domain error rule

Every business-rule failure inside a use-case MUST throw a specific domain
error class — NEVER a generic Nest `BadRequestException` / `NotFoundException`
with an inline message.

- Each error extends `DomainError` (`@/shared/types/domain.error`) with a
  stable `code` (`SCREAMING_SNAKE_CASE`) and a user-facing `message`.
  Default HTTP status is 400; set `httpStatus` explicitly for anything else
  (e.g. 404). `DomainExceptionFilter` renders `{ code, message }` to the client.
- Errors live in an `errors/` directory colocated with the feature's
  `use-cases/` directory (sibling: `controllers/`, `dto/`, `errors/`,
  `use-cases/`), one class per file (`<kebab-case>.error.ts`), re-exported
  from `errors/index.ts` with NAMED exports only — no `export *` wildcard
  barrels. Reference: `internal/actors/client/consultation/chat/`.
- Name after the business condition, not the HTTP status
  (`ActiveConsultationExistsError`, not `ChatConflictError`).
- Carry structured context as typed fields for the client, not string
  interpolation (`existingConsultationId`, not `"...id " + id`).

```ts
// errors/expert-busy-in-consultation.error.ts
import { DomainError } from '@/shared/types/domain.error';

export class ExpertBusyInConsultationError extends DomainError {
  readonly code = 'EXPERT_BUSY_IN_CONSULTATION';
  readonly message: string;

  constructor(status: string) {
    super();
    this.message =
      status === ConsultationStatus.ACTIVE
        ? 'This astrologer is currently busy in a consultation. ...'
        : 'This astrologer already has a pending request. ...';
  }
}

// use-cases/initiate-chat.usecase.ts
import { ExpertBusyInConsultationError } from '../errors';

if (expertBusy) throw new ExpertBusyInConsultationError(expertBusy.status);
```
