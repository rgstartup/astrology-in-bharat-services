# Schema Boundary Map

## Purpose
Define clear PostgreSQL schema boundaries for this codebase, with `public.users` as the shared identity anchor and domain tables separated by bounded context.

## Final Boundary Decision

### `public` (shared core)
- `users`
- `roles`
- `user_roles`
- `typeorm_metadata` (infra)
- extension-owned objects (infra)

### `auth` (authentication/session state)
- `sessions`
- `oauth_accounts`
- `used_tokens` (from `UsedTokens` entity with implicit table name)

### `client` (client-facing profile aggregate)
- `profile_clients`

### `expert` (expert-facing profile aggregate)
- `profile_experts`
- `expert_bank_accounts`
- `expert_todos`

### `profile_common` (shared profile subdomain)
- `addresses` (independent table attached to either `profile_clients` or `profile_experts`)

### `consultations` (live + async consultation domain)
- `chat_sessions`
- `chat_messages`
- `call_sessions`
- `reviews`
- `quotes`

### `commerce` (catalog + ordering)
- `products`
- `carts`
- `cart_items`
- `wishlists`
- `product_orders`
- `order_items`

### `finance` (money movement + payout flow)
- `wallets`
- `transactions`
- `withdrawals`
- `payment_orders`

### `support` (post-transaction/user support + alerts)
- `support_disputes`
- `support_dispute_messages`
- `notifications`

### `content` (reference/editorial)
- `festivals`

## Boundary Rules
- `public.users` is the global FK anchor for cross-schema references.
- `auth` contains auth/session lifecycle state only; it does not own user master data.
- `addresses` is profile-scoped (not user-scoped): one address record belongs to either client profile or expert profile.
- Each table has one owning schema; cross-domain access happens via FK/reference, not split ownership.
- New tables must be created directly in the owning schema (avoid adding business tables to `public`).

## Notes
- If `quotes` evolves into product-pricing quotes, reconsider moving it from `consultations` to `commerce`.
- If `expert_bank_accounts` becomes strictly payout-ledger managed, reconsider moving it from `expert` to `finance`.
- Keep `public` lean: no new business-domain tables there beyond explicitly shared identity core.
