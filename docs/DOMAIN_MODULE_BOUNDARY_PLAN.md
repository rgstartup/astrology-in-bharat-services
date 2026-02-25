# Domain Module Boundary Plan

## Objective
Organize the current `src/modules/*` set into clear domain modules and sub-modules so ownership, dependencies, and future scaling remain predictable.

## Current Module Inventory
- `admin`
- `auth`
- `call`
- `cart`
- `chat`
- `client/profile`
- `expert/bank-accounts`
- `expert/dashboard`
- `expert/earnings`
- `expert/profile`
- `expert/todos`
- `festival`
- `matchmaking`
- `notification`
- `order`
- `payment`
- `product`
- `quotes`
- `reviews`
- `role`
- `support`
- `users`
- `wallet`
- `wishlist`

## Target Boundary Model

### 1) Identity & Access Domain
Purpose: account identity, roles, authentication, and session lifecycle.

Sub-modules:
- `users`
- `role`
- `auth`

Ownership:
- `users` owns account master identity.
- `role` owns permission/role catalog and role assignment rules.
- `auth` owns login/session/token flows and auth integration (OAuth, magic link, JWT, etc.).

### 2) Profile Domain
Purpose: role-specific profile aggregates and profile-operational data.

Sub-modules:
- `client/profile`
- `expert/profile`
- `expert/bank-accounts`
- `expert/todos`
- `expert/dashboard`
- `expert/earnings`

Ownership:
- Client and expert profile flows evolve independently.
- Expert operational tools remain inside expert sub-domain.

### 3) Consultation Domain
Purpose: user-expert interaction lifecycle before/during/after sessions.

Sub-modules:
- `chat`
- `call`
- `quotes`
- `reviews`
- `matchmaking`

Ownership:
- Session channels (`chat`, `call`) plus pricing/proposal (`quotes`) and outcomes (`reviews`) are one cohesive interaction domain.

### 4) Commerce Domain
Purpose: purchasable catalog and order placement lifecycle.

Sub-modules:
- `product`
- `cart`
- `wishlist`
- `order`

Ownership:
- Product-to-order funnel and basket management are owned by commerce.

### 5) Finance Domain
Purpose: monetary ledger, collection, settlement, and payout.

Sub-modules:
- `wallet`
- `payment`

Ownership:
- `payment` handles gateway/order capture state.
- `wallet` handles internal balance ledger and withdrawal flows.

### 6) Support & Communications Domain
Purpose: user support operations and system-user messaging.

Sub-modules:
- `support`
- `notification`

Ownership:
- Disputes, resolution messaging, and product/system notifications.

### 7) Content & Admin Domain
Purpose: static/dynamic content and backoffice operations.

Sub-modules:
- `festival`
- `admin`

Ownership:
- Content entities and admin-only orchestration/control workflows.

## Dependency Rules (Boundary Guardrails)
- `Identity & Access` is foundational and can be consumed by all other domains.
- `Profile` can depend on `Identity & Access`, but not on `Commerce` or `Finance`.
- `Consultation` can depend on `Identity & Access` and `Profile`.
- `Commerce` can depend on `Identity & Access`; avoid direct dependency on `Consultation`.
- `Finance` can depend on `Identity & Access` and `Commerce`; avoid reverse dependency from `Identity`.
- `Support & Communications` may consume events from all domains, but core domains should not directly depend on support internals.
- `Content & Admin` may orchestrate across domains but should use facades/use-cases, not direct repository reach-through.

## Folder Organization Recommendation

Short-term (minimal churn):
- Keep existing module paths.
- Add domain ownership notes to each module `README.md` (or module header docs).
- Enforce dependency rules through code review.

Mid-term (explicit structure):
- Introduce domain grouping folders:
  - `src/modules/identity/*`
  - `src/modules/profile/*`
  - `src/modules/consultation/*`
  - `src/modules/commerce/*`
  - `src/modules/finance/*`
  - `src/modules/support/*`
  - `src/modules/content/*`
- Move existing modules incrementally, preserving exports/API contracts.

## Migration Plan (Phased)

### Phase 1: Boundary Definition
- Freeze this mapping as the source of truth.
- Add lint/review rules: no new cross-domain repository calls.
- Require facade-based integration between domains.

### Phase 2: Contract Cleanup
- Identify direct cross-module repository/entity coupling.
- Replace with:
  - facade calls
  - application service interfaces
  - domain events for async side effects

### Phase 3: Physical Reorganization
- Move modules into grouped domain folders one domain at a time.
- Keep path aliases stable during migration (temporary re-export barrels if needed).
- Validate app bootstrapping and module imports after each move.

### Phase 4: Enforcement
- Add architectural tests or static checks for import boundaries.
- Block PRs that introduce forbidden domain dependencies.

## Decision Log (Current)
- `users` remains globally shared identity anchor.
- `auth` is separate from `users` and focuses on authentication/session concerns.
- Profile remains split by role (`client` and `expert`) with shared profile-level constructs where needed.
