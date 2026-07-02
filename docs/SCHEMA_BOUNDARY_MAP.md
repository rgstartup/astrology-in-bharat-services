# Schema Boundary Map

## Purpose
Define clear PostgreSQL schema boundaries for this codebase, with `public.users` as the shared identity anchor and role/domain tables separated by bounded context.

## Final Boundary Decision

### `public` (shared identity core)
- `users`
- `roles`
- `user_roles`
- `addresses`
- `typeorm_metadata` (infra)
- extension-owned objects (infra)

### `auth` (authentication/session state)
- `sessions`
- `oauth_accounts`
- `used_tokens`

### `client` (client-specific profile aggregate)
- `profile`

### `expert` (expert-specific profile and operations)
- `profile`
- `bank_accounts`
- `todos`
- `pujas`

### `merchant` (merchant-specific profile aggregate)
- `profile`

### `agent` (agent-specific profile and listing operations)
- `profile`
- `listings`

### `consultations` (live + async consultation domain)
- `chat_sessions`
- `chat_messages`
- `call_sessions`
- `reviews`
- `quotes`
- `puja_appointments`

### `commerce` (catalog + ordering)
- `products`
- `carts`
- `cart_items`
- `wishlists`
- `coupons`
- `user_coupons`
- `product_orders`
- `order_items`

### `finance` (money movement + payout flow)
- `wallets`
- `transactions`
- `withdrawals`
- `payment_orders`
- `idempotency_keys`

### `support` (post-transaction/user support + alerts)
- `support_disputes`
- `support_dispute_messages`
- `notifications`

### `content` (reference/editorial + cache tables)
- `festivals`
- `calendar_cache`
- `places_cache`
- `place_images_cache`

### `admin` (backoffice control and settings)
- `admin_audit_logs`
- `system_settings`

## Boundary Rules
- `public.users` is the shared identity anchor for all user types: client, expert, merchant, agent, and admin.
- Role-specific profile tables live in the schema for that role, not in `public`.
- Merchant-specific tables belong in `merchant`, including merchant profile data.
- Agent-specific tables belong in `agent`, including agent profile data and agent-owned listings.
- `addresses` stays in `public` by exception, even though it is profile-scoped.
- `auth` contains auth/session lifecycle state only; it does not own user master data.
- Each table has one owning schema; cross-domain access happens via FK/reference, not split ownership.
- New role-specific tables should be created directly in their owning role schema, not added to `public`.
- New business tables should be created directly in the owning schema (avoid adding business tables to `public`).

## Notes
- Merchant and agent are first-class user types in the boundary model, alongside client and expert.
- If `quotes` evolves into product-pricing quotes, reconsider moving it from `consultations` to `commerce`.
- If `bank_accounts` becomes strictly payout-ledger managed, reconsider moving it from `expert` to `finance`.
- Keep `public` lean: no new business-domain tables there beyond shared identity core and the explicit `addresses` exception.
