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
