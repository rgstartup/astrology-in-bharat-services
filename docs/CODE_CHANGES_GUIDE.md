# Code Changes Guide: Schema Reorganisation

Companion to `FK_MIGRATION_TO_PROFILE_TABLES.md`. Every file that needs a change is listed with the exact method and what must be updated.

---

## Conventions

- `ClientProfile` = the TypeORM entity for `client.profile`
- `ExpertProfile` = the TypeORM entity for `expert.profile`
- `AgentProfile` = the TypeORM entity for `agent.profile`
- `public.user` = Better Auth's user table. Since it is in the same DB, query builders can join it directly using a raw table string — no TypeORM entity needed.
- **Better Auth admin client** = used for user management operations (list users, set role, ban, delete). Import from `auth-server/src/auth.ts` via the shared client or call the auth-server API.
- All service methods receive `betterAuthUserId: string` from the auth guard (`req.user.id`). Profile resolution is the first step inside each use-case.

---

## 0. Global: Delete the NestJS `User` Entity

**File to delete:**
```
src/modules/users/infrastructure/persistence/entities/user.entity.ts
```

Replace every `User` import across the codebase with the appropriate profile entity:
- `ClientProfile` — when the reference is a client-owned FK
- `ExpertProfile` — when the reference is an expert-owned FK
- `AgentProfile` — when the reference is an agent-owned FK

For queries that need `name` / `email` from `public.user` (listings, admin views), join the table directly in the query builder — no TypeORM entity needed:

```ts
// Raw join to public.user inside any createQueryBuilder chain
.innerJoin('"user"', 'u', 'u.id = profile.better_auth_user_id')
.addSelect(['u.name', 'u.email', 'u.role', 'u.banned'])
```

```bash
# Find every file still importing User
grep -rn "from.*user\.entity\|UserEntity\|InjectRepository(User)" src/ --include="*.ts"
```

---

## 1. Profile Entities — Schema + Anchor Change

### `client.profile`
**File:** `src/modules/client/profile/infrastructure/persistence/entities/profile-client.entity.ts`
```ts
// Change
@Entity({ name: 'profile', schema: 'client' })
export class ClientProfile {
  // Remove: @ManyToOne(() => User) user: User;
  // Keep as plain column — FK enforced at DB level only
  @Column({ unique: true }) better_auth_user_id: string;
  // ... all other columns unchanged
}
```

**Use-cases: no changes needed.** They already use `better_auth_user_id` for all lookups.

### `expert.profile`
**File:** `src/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity.ts`
```ts
@Entity({ name: 'profile', schema: 'expert' })
export class ExpertProfile {
  // Remove: @ManyToOne(() => User) user: User;
  @Column({ unique: true }) better_auth_user_id: string;
}
```

**Use-cases: no changes needed.** Already use `better_auth_user_id`.

One exception — `list-experts.usecase.ts`:
```ts
// Remove: .leftJoinAndSelect('profile.user', 'user')
// Replace with a raw join to public.user:
.innerJoin('"user"', 'u', 'u.id = profile.better_auth_user_id')
.addSelect(['u.name', 'u.email'])
.where('u.name ILIKE :name', { name: `%${name}%` })
```

### `agent.profile`
**File:** `src/modules/agent/infrastructure/persistence/entities/agent-profile.entity.ts`
```ts
@Entity({ name: 'profile', schema: 'agent' })
export class AgentProfile {
  // Remove: @OneToOne(() => User) user: User;
  @Column({ unique: true }) better_auth_user_id: string;
}
```

---

## 2. New: `Referral` Entity

**New file:** `src/modules/referral/infrastructure/persistence/entities/referral.entity.ts`
```ts
@Entity({ name: 'referral', schema: 'public' })
export class Referral {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => ClientProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referrer_client_id' })
  referrerClient: ClientProfile | null;

  @ManyToOne(() => ExpertProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referrer_expert_id' })
  referrerExpert: ExpertProfile | null;

  @ManyToOne(() => AgentProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referrer_agent_id' })
  referrerAgent: AgentProfile | null;

  @ManyToOne(() => ClientProfile, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referee_client_id' })
  refereeClient: ClientProfile | null;

  @ManyToOne(() => ExpertProfile, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referee_expert_id' })
  refereeExpert: ExpertProfile | null;

  @ManyToOne(() => AgentProfile, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referee_agent_id' })
  refereeAgent: AgentProfile | null;

  @CreateDateColumn() created_at: Date;
}
```

---

## 3. Cart Module

**Entity** `src/modules/cart/infrastructure/persistence/entities/cart.entity.ts`
```ts
@Entity({ name: 'cart', schema: 'client' })
export class Cart {
  // Remove: @OneToOne(() => User) user: User;
  @Column() client_id: number;
  @ManyToOne(() => ClientProfile) @JoinColumn({ name: 'client_id' }) client: ClientProfile;
}
```

**Entity** `src/modules/cart/infrastructure/persistence/entities/cart-item.entity.ts`
```ts
@Entity({ name: 'cart_item', schema: 'client' })
```

### Use-cases

| File | Method | Change |
|------|--------|--------|
| `use-cases/get-cart.use-case.ts` | `execute(userId)` | `findOne({ where: { user: { id: userId } } })` → `findOne({ where: { client_id: clientProfileId } })` |
| `use-cases/add-to-cart.use-case.ts` | `execute(userId, dto)` | Same query fix. Remove `userRepository` injection. |
| `use-cases/update-cart-item.use-case.ts` | `execute(userId, dto)` | Same query fix. |
| `use-cases/remove-cart-item.use-case.ts` | `execute(userId, productId)` | Same query fix. |
| `use-cases/clear-cart.use-case.ts` | `execute(userId)` | Same query fix. |

**Facade** `cart.facade.ts` — rename parameter `userId` → `clientProfileId` in all methods for clarity.

**Profile resolution pattern** (add once per use-case that needs it):
```ts
const profile = await this.clientProfileRepo.findOneByOrFail({ better_auth_user_id: betterAuthUserId });
// then use profile.id as clientProfileId
```

---

## 4. Order Module

**Entity** `src/modules/order/infrastructure/persistence/entities/order.entity.ts`
```ts
@Entity({ name: 'order', schema: 'client' })
export class Order {
  // Remove: @ManyToOne(() => User) user: User;
  @Column() client_id: number;
  @ManyToOne(() => ClientProfile) @JoinColumn({ name: 'client_id' }) client: ClientProfile;
}
```

**Entity** `src/modules/order/infrastructure/persistence/entities/order-item.entity.ts`
```ts
@Entity({ name: 'order_item', schema: 'client' })
```

### Use-cases

| File | Method | Change |
|------|--------|--------|
| `use-cases/get-order-by-id.use-case.ts` | `execute(id, userId)` | `findOne({ where: { id, user_id: userId } })` → `{ id, client_id: clientProfileId }` |
| `use-cases/get-user-orders.use-case.ts` | `execute(userId)` | `find({ where: { user_id: userId } })` → `{ client_id: clientProfileId }` |
| `use-cases/find-all-orders.use-case.ts` | `execute()` | `relations: ['user']` → `relations: ['client']` |
| `use-cases/create-order-from-cart.use-case.ts` | `execute(userId, dto)` | Remove `User` repo injection. `create(Order, { user_id: userId })` → `{ client_id: clientProfileId }`. Also update wallet credit call: `session.user_id` → `session.client_id`. |
| `use-cases/mark-order-as-paid.use-case.ts` | `execute(razorpayOrderId)` | `order.user_id` → `order.client_id`. Profile lookup: `findOne({ where: { id: order.client_id } })` directly (already a profile id). |
| `use-cases/update-order-status.use-case.ts` | `execute(id, status, reason)` | Remove `User` repo injection. `order.user_id` → `order.client_id` in all notification calls (lines ~144–163). Profile lookup becomes direct: `order.client_id` is already `ClientProfile.id`. |

---

## 5. Payment Module

**Entity** `src/modules/payment/infrastructure/persistence/entities/payment-order.entity.ts`
```ts
@Entity({ name: 'payment_order', schema: 'client' })
export class PaymentOrder {
  @Column({ nullable: true }) client_id: number;
  @ManyToOne(() => ClientProfile, { nullable: true }) @JoinColumn({ name: 'client_id' }) client: ClientProfile | null;
}
```

### Use-cases

| File | Method | Change |
|------|--------|--------|
| `use-cases/create-payment-order.use-case.ts` | `execute(userId, dto)` | `create({ user_id: userId })` → `{ client_id: clientProfileId }` |
| `use-cases/verify-payment.use-case.ts` | `execute(dto)` | `walletFacade.topUp(order.user_id, ...)` → `walletFacade.topUp(order.client_id, 'client', ...)` |

---

## 6. Coupon Module

**Entity** `src/modules/coupon/infrastructure/persistence/entities/user-coupon.entity.ts`
```ts
@Entity({ name: 'client_coupon', schema: 'client' })
export class ClientCoupon {   // rename class too
  @Column() client_id: number;
  @ManyToOne(() => ClientProfile) @JoinColumn({ name: 'client_id' }) client: ClientProfile;
}
```

**Entity** `src/modules/coupon/infrastructure/persistence/entities/coupon.entity.ts`
```ts
@Entity({ name: 'coupon', schema: 'commerce' })
```

### Use-cases

| File | Method | Change |
|------|--------|--------|
| `use-cases/apply-coupon.use-case.ts` | `execute(userId, code, amount)` | `where: { user_id: userId, coupon_id }` → `{ client_id: clientProfileId, coupon_id }` |
| `use-cases/get-my-rewards.use-case.ts` | `execute(userId)` | `where: { user_id: userId }` → `{ client_id: clientProfileId }` |

---

## 7. Wishlist Module

**Entity** `src/modules/wishlist/infrastructure/persistence/entities/wishlist.entity.ts`
```ts
@Entity({ name: 'wishlist', schema: 'client' })
export class Wishlist {
  @Column() client_id: number;
  @ManyToOne(() => ClientProfile) @JoinColumn({ name: 'client_id' }) client: ClientProfile;

  // Fix: was wrongly pointing at User
  @ManyToOne(() => ExpertProfile, { nullable: true }) @JoinColumn({ name: 'expert_id' }) expert: ExpertProfile | null;
}
```

### Use-cases — all follow the same pattern

| File | Method | Change |
|------|--------|--------|
| `use-cases/get-product-wishlist.use-case.ts` | `execute(userId)` | `where: { user: { id: userId } }` → `{ client_id: clientProfileId }` |
| `use-cases/add-product-to-wishlist.use-case.ts` | `execute(userId, productId)` | Same. Remove `FindUserUseCase` injection — profile existence is guaranteed by auth guard. |
| `use-cases/remove-product-from-wishlist.use-case.ts` | `execute(userId, productId)` | Same. |
| `use-cases/get-expert-wishlist.use-case.ts` | `execute(userId)` | `where: { user: { id: userId } }` → `{ client_id: clientProfileId }` |
| `use-cases/add-expert-to-wishlist.use-case.ts` | `execute(userId, expertId)` | `where: { user: { id: userId }, expert: { id: expertId } }` → `{ client_id: clientProfileId, expert_id: expertId }` |
| `use-cases/remove-expert-from-wishlist.use-case.ts` | `execute(userId, expertId)` | Same. |
| `use-cases/get-puja-wishlist.use-case.ts` | `execute(userId)` | Same as products. |
| `use-cases/add-puja-to-wishlist.use-case.ts` | `execute(userId, pujaId)` | Same. |
| `use-cases/remove-puja-from-wishlist.use-case.ts` | `execute(userId, pujaId)` | Same. |
| `use-cases/toggle-puja-wishlist.use-case.ts` | `execute(userId, pujaId)` | Remove `User` repo injection. Replace user lookup with `clientProfileRepo.findOneByOrFail({ better_auth_user_id: userId })`. Update query to use `client_id`. |

---

## 8. Chat Module

**Entity** `src/modules/chat/infrastructure/persistence/entities/chat-session.entity.ts`
```ts
@Entity({ name: 'chat_session', schema: 'consultation' })
export class ChatSession {
  @Column() client_id: number;
  @ManyToOne(() => ClientProfile) @JoinColumn({ name: 'client_id' }) client: ClientProfile;
  // expert relation unchanged
}
```

**Entity** `src/modules/chat/infrastructure/persistence/entities/chat-message.entity.ts`
```ts
@Entity({ name: 'chat_message', schema: 'consultation' })
```

### Use-cases

| File | Method | Change |
|------|--------|--------|
| `use-cases/initiate-chat.use-case.ts` | `execute(userId, expertId)` | All `where: [{ user_id: userId }, ...]` → `client_id: clientProfileId`. `create({ user_id: userId })` → `{ client_id: clientProfileId }`. |
| `use-cases/find-client-sessions.use-case.ts` | `execute(userId)` | `where: { user_id: userId }` → `{ client_id: clientProfileId }`. `relations: ['expert', 'expert.user']` → `['expert']` (no user relation on expert anymore — load `better_auth_user_id` directly). |
| `use-cases/find-expert-sessions.use-case.ts` | `execute(userId, filter)` | Expert lookup: `findOne({ where: { better_auth_user_id: userId } })` — already correct. All session `where` clauses: `user_id` → `client_id`. `relations: ['user']` on sessions → `relations: ['client']`. |
| `use-cases/find-active-client-session.use-case.ts` | `execute(userId)` | `[{ user_id: userId, status }, ...]` → `client_id: clientProfileId`. |
| `use-cases/get-session.use-case.ts` | `execute(id)` | `relations: ['user', 'expert', 'expert.user']` → `relations: ['client', 'expert']`. |
| `use-cases/end-chat.use-case.ts` | `execute(sessionId, ...)` | `walletFacade.releaseReserved(session.user_id, ...)` → `(session.client_id, 'client', ...)`. `walletFacade.deductFromReserved(session.user_id, ...)` → same fix. `relations: ['expert', 'expert.user']` → `['expert']`. |
| `use-cases/expire-session.use-case.ts` | `execute(sessionId)` | `walletFacade.releaseReserved(session.user_id, ...)` → `(session.client_id, 'client', ...)`. |
| `use-cases/convert-to-paid.use-case.ts` | `execute(sessionId)` | All `walletFacade` calls using `session.user_id` → `session.client_id, 'client'`. |
| `use-cases/find-all-sessions.use-case.ts` | query builder | `leftJoinAndSelect('session.user', 'user')` → `leftJoinAndSelect('session.client', 'client')`. |

---

## 9. Call Module

**Entity** `src/modules/call/infrastructure/persistence/entities/call-session.entity.ts`
```ts
@Entity({ name: 'call_session', schema: 'consultation' })
export class CallSession {
  @Column() client_id: number;
  @ManyToOne(() => ClientProfile) @JoinColumn({ name: 'client_id' }) client: ClientProfile;
}
```

### Use-cases

| File | Method | Change |
|------|--------|--------|
| `use-cases/initiate-call.use-case.ts` | `execute(userId, expertId)` | `[{ user_id: userId, status }, ...]` → `client_id: clientProfileId`. `walletFacade.validateBalance(userId, ...)` → `(clientProfileId, 'client', ...)`. `walletFacade.reserveBalance(userId, ...)` → same. `relations: ['user', 'expert']` → `['client', 'expert']`. |
| `use-cases/accept-call.use-case.ts` | `execute(sessionId)` | `relations: ['user', 'expert', 'expert.user']` → `['client', 'expert']`. |
| `use-cases/end-call.use-case.ts` | `execute(sessionId, ...)` | All `walletFacade` calls using `session.user_id` → `session.client_id, 'client'`. `expertRepo.findOne(...relations: ['user'])` → remove user relation. |
| `use-cases/get-call-session.use-case.ts` | `execute(id)` | `relations: ['user', 'expert', 'expert.user']` → `['client', 'expert']`. |
| `use-cases/get-expert-sessions.use-case.ts` | `execute(userId, filter)` | Expert lookup already uses `better_auth_user_id` — correct. `relations: ['user']` on sessions → `relations: ['client']`. |

---

## 10. Reviews Module

**Entity** `src/modules/reviews/infrastructure/persistence/entities/review.entity.ts`
```ts
@Entity({ name: 'review', schema: 'consultation' })
export class Review {
  @Column() client_id: number;
  @ManyToOne(() => ClientProfile) @JoinColumn({ name: 'client_id' }) client: ClientProfile;
}
```

### Use-cases

| File | Method | Change |
|------|--------|--------|
| `use-cases/create-review.use-case.ts` | `execute(userId, dto)` | `chatSession.user_id` → `chatSession.client_id`. `callSession.user_id` → `callSession.client_id`. Ownership check: `session.client_id !== clientProfileId`. `create({ user_id: userId })` → `{ client_id: clientProfileId }`. Query builder `client_id` in review count. |
| `use-cases/get-expert-reviews.use-case.ts` | `execute(expertId)` | `relations: ['user']` → `relations: ['client']`. Response mapping: replace user fields with client profile fields. |

---

## 11. Puja Appointment Module

**Entity** `src/modules/puja-appointment/infrastructure/persistence/entities/puja-appointment.entity.ts`
```ts
@Entity({ name: 'puja_appointment', schema: 'consultation' })
export class PujaAppointment {
  @Column() client_id: number;
  @ManyToOne(() => ClientProfile) @JoinColumn({ name: 'client_id' }) client: ClientProfile;
  // puja relation now points to expert.puja
  @ManyToOne(() => ExpertPuja) @JoinColumn({ name: 'puja_id' }) puja: ExpertPuja;
}
```

### Use-cases

| File | Method | Change |
|------|--------|--------|
| `use-cases/create-puja-appointment.use-case.ts` | `execute(userId, dto)` | `create({ user_id: userId })` → `{ client_id: clientProfileId }`. |
| `use-cases/get-user-puja-appointments.use-case.ts` | `execute(userId)` | `where: { user_id: userId }` → `{ client_id: clientProfileId }`. `relations: ['expert', 'expert.user', 'puja']` → `['expert', 'puja']`. |
| `use-cases/get-expert-puja-appointments.use-case.ts` | `execute(userId)` | Expert lookup: already uses `better_auth_user_id` — correct. `relations: ['user', 'puja']` on appointment → `relations: ['client', 'puja']`. |
| `use-cases/update-puja-appointment-status.use-case.ts` | `execute(id, status, ...)` | `relations: ['expert', 'puja', 'user']` → `['expert', 'puja', 'client']`. `appointment.user_id` → `appointment.client_id` in all wallet calls. Notification call: `appointment.user_id` → `appointment.client_id`. |

---

## 12. Expert Domain Entities (Schema Move Only)

These entities already use `expert_id` (FK to `ExpertProfile.id`) or `better_auth_user_id` — **no query changes needed**, only `@Entity` decorator updates.

| Entity class | File | Change |
|---|---|---|
| `ExpertPuja` | `expert/profile/…/expert-puja.entity.ts` | `@Entity({ name: 'puja', schema: 'expert' })` |
| `BankAccount` | `expert/bank-accounts/…/bank-account.entity.ts` | `@Entity({ name: 'bank_account', schema: 'expert' })` |
| `Todo` | `expert/todos/…/todo.entity.ts` | `@Entity({ name: 'todo', schema: 'expert' })` |

**`get-puja-by-id.usecase.ts`** and **`list-all-pujas.usecase.ts`**:
```ts
// Remove: relations: ['expert', 'expert.user']
// Change to: relations: ['expert']
// expert.better_auth_user_id is available directly on ExpertProfile
```

---

## 13. Agent Module

**Entity** `src/modules/agent/infrastructure/persistence/entities/agent-listing.entity.ts`
```ts
@Entity({ name: 'listing', schema: 'agent' })
export class AgentListing {
  @Column() agent_id: number;
  // Was: ManyToOne(() => User) — fix to AgentProfile
  @ManyToOne(() => AgentProfile) @JoinColumn({ name: 'agent_id' }) agent: AgentProfile;
}
```

**Controller** `src/modules/agent/api/controllers/agent.controller.ts`:

| Method | Change |
|--------|--------|
| `getStats(user)` | Remove any `User` repo queries. Agent registered-users list (`registered_user_ids`) stores Better Auth UUIDs — look up `ClientProfile` / `ExpertProfile` by `better_auth_user_id` instead of joining User table. |
| `createListing(user, body)` | `agent_id: profile.user_id` → `agent_id: profile.id` (AgentProfile int PK). |
| `getListings(user)` | Update join: `leftJoinAndSelect('listing.agent', 'agent')` — now loads `AgentProfile`, not User. |

---

## 14. Wallet Module

**Entity** `src/modules/wallet/infrastructure/persistence/entities/wallet.entity.ts`
```ts
@Entity({ name: 'wallet', schema: 'finance' })
export class Wallet {
  @ManyToOne(() => ClientProfile, { nullable: true }) @JoinColumn({ name: 'client_id' }) client: ClientProfile | null;
  @ManyToOne(() => ExpertProfile, { nullable: true }) @JoinColumn({ name: 'expert_id' }) expert: ExpertProfile | null;
}
```

**Entity** `src/modules/wallet/infrastructure/persistence/entities/withdrawal.entity.ts`
```ts
@Entity({ name: 'withdrawal', schema: 'expert' })
export class Withdrawal {
  @ManyToOne(() => ExpertProfile) @JoinColumn({ name: 'expert_id' }) expert: ExpertProfile;
  @Column({ type: 'text', nullable: true }) admin_id: string | null; // public.user.id text UUID
}
```

**Entity** `src/modules/wallet/infrastructure/persistence/entities/transaction.entity.ts`
```ts
@Entity({ name: 'transaction', schema: 'finance' })
```

### Wallet Facade — add `role` parameter to all methods

```ts
// wallet.facade.ts — every method gains a role parameter
getWallet(profileId: number, role: 'client' | 'expert')
getBalance(profileId: number, role: 'client' | 'expert')
credit(profileId: number, role: 'client' | 'expert', ...)
debit(profileId: number, role: 'client' | 'expert', ...)
reserveBalance(profileId: number, role: 'client' | 'expert', ...)
releaseReserved(profileId: number, role: 'client' | 'expert', ...)
deductFromReserved(profileId: number, role: 'client' | 'expert', ...)
topUp(profileId: number, role: 'client' | 'expert', ...)
getTransactions(profileId: number, role: 'client' | 'expert', ...)
getTotalEarnings(profileId: number, role: 'client' | 'expert', ...)
```

### Use-cases

| File | Method | Change |
|------|--------|--------|
| `use-cases/get-wallet.use-case.ts` | `execute(profileId, role)` | `where: { user_id: profileId }` → `role === 'client' ? { client_id: profileId } : { expert_id: profileId }` |
| `use-cases/get-balance.use-case.ts` | `execute(profileId, role)` | Pass `role` to `GetWalletUseCase`. |
| `use-cases/validate-balance.use-case.ts` | `execute(profileId, role, min)` | Pass `role` down. |
| `use-cases/credit.use-case.ts` | `execute(profileId, role, ...)` | Wallet lookup: branch by role. Remove `User` repo query for `better_auth_user_id` — pass profile entity directly. Expert earning update: use `expertProfileRepo.findOneBy({ id: profileId })`. |
| `use-cases/debit.use-case.ts` | `execute(profileId, role, ...)` | Wallet lookup: branch by role. Client spending update: `clientProfileRepo.findOneBy({ id: profileId })`. |
| `use-cases/reserve-balance.use-case.ts` | `execute(profileId, role, ...)` | Wallet lookup: branch by role. |
| `use-cases/deduct-from-reserved.use-case.ts` | `execute(profileId, role, ...)` | Wallet lookup: branch by role. Remove `ProfileClient.findOne({ where: { user: { id: profileId } } })` — replace with `clientProfileRepo.findOneBy({ id: profileId })`. |
| `use-cases/release-reserved.use-case.ts` | `execute(profileId, role, ...)` | Wallet lookup: branch by role. |
| `use-cases/top-up.use-case.ts` | `execute(profileId, role, ...)` | Pass `role` to `CreditUseCase`. |
| `use-cases/request-withdrawal.use-case.ts` | `execute(expertProfileId, amount, bankAccountId)` | Expert-only — remove role param, always queries `expert_id`. `where('w.user_id = :userId')` → `where('w.expert_id = :expertId')`. `create({ user_id })` → `{ expert_id: expertProfileId }`. |
| `use-cases/get-transactions.use-case.ts` | `execute(profileId, role, ...)` | Pass `role` to `GetWalletUseCase`. Withdrawal lookup: `where({ user_id: profileId })` → `where({ expert_id: profileId })`. |
| `use-cases/get-withdrawals-status.use-case.ts` | `execute(expertProfileId)` | `w.user_id = :userId` → `w.expert_id = :expertId`. |
| `use-cases/get-total-earnings.use-case.ts` | `execute(profileId, role)` | `wallet.user_id = :userId` → branch: `wallet.client_id = :id` or `wallet.expert_id = :id`. |
| `use-cases/get-pending-withdrawals.use-case.ts` | `execute()` | `relations: ['user', 'bankAccount']` → `relations: ['expert', 'bankAccount']`. |
| `use-cases/update-withdrawal-status.use-case.ts` | `execute(id, status, adminBaUserId, remark)` | `admin_id` is now TEXT (Better Auth UUID). Wallet refund lookup: `where({ expert_id: withdrawal.expert_id })`. `AdminAuditLog` `admin_id` is now TEXT — pass `adminBaUserId` directly. |

**Wallet Controller** `wallet.controller.ts`:
```ts
// Extract profile + role from every authenticated endpoint
@Get()
async getWallet(@CurrentUser() user: { id: string; role: string }) {
  const profile = await this.resolveProfile(user.id, user.role);
  return this.walletFacade.getWallet(profile.id, user.role as 'client' | 'expert');
}

// Add a private helper to the controller or a shared service:
private async resolveProfile(betterAuthUserId: string, role: string) {
  if (role === 'client') return this.clientProfileRepo.findOneByOrFail({ better_auth_user_id: betterAuthUserId });
  if (role === 'expert') return this.expertProfileRepo.findOneByOrFail({ better_auth_user_id: betterAuthUserId });
  throw new ForbiddenException();
}
```

---

## 15. Support Module

**Entity** `src/modules/support/infrastructure/persistence/entities/dispute.entity.ts`
```ts
@Entity({ name: 'dispute', schema: 'support' })
export class Dispute {
  // Remove: @ManyToOne(() => User) user: User;
  @Column({ nullable: true }) client_id: number | null;
  @Column({ nullable: true }) expert_id: number | null;
  @Column({ nullable: true }) agent_id: number | null;

  @ManyToOne(() => ClientProfile, { nullable: true }) @JoinColumn({ name: 'client_id' }) client: ClientProfile | null;
  @ManyToOne(() => ExpertProfile, { nullable: true }) @JoinColumn({ name: 'expert_id' }) expert: ExpertProfile | null;
  @ManyToOne(() => AgentProfile, { nullable: true }) @JoinColumn({ name: 'agent_id' }) agent: AgentProfile | null;
}
```

**Entity** `src/modules/support/infrastructure/persistence/entities/dispute-message.entity.ts`
```ts
@Entity({ name: 'dispute_message', schema: 'support' })
export class DisputeMessage {
  // Remove: @ManyToOne(() => User) sender: User;
  @Column({ nullable: true }) client_id: number | null;
  @Column({ nullable: true }) expert_id: number | null;
  @Column({ nullable: true }) agent_id: number | null;
  @Column({ type: 'text', nullable: true }) admin_id: string | null; // Better Auth UUID

  // Update sender_type enum: 'user' → 'client'
  @Column({ type: 'enum', enum: ['client', 'expert', 'agent', 'admin'] })
  sender_type: 'client' | 'expert' | 'agent' | 'admin';
}
```

### Support Facade + Use-cases — add `role` to every signature

| File | Method | Change |
|------|--------|--------|
| `use-cases/create-dispute.use-case.ts` | `execute(profileId, role, dto)` | `create({ user_id: profileId })` → set the correct role column: `{ client_id: profileId }` / `{ expert_id }` / `{ agent_id }`. |
| `use-cases/get-disputes.use-case.ts` | `execute(profileId, role)` | `where: { user_id: profileId }` → branch by role column. |
| `use-cases/get-dispute-by-id.use-case.ts` | `execute(profileId, role, disputeId)` | `where: { id: disputeId, user_id: profileId }` → branch by role column. |
| `use-cases/send-message.use-case.ts` | `execute(profileId, role, disputeId, dto)` | Dispute lookup: branch by role. Message create: `sender_id: profileId, sender_type: 'user'` → set correct role column + `sender_type: role`. For `admin`, set `admin_id: betterAuthUserId` (TEXT). |
| `use-cases/get-messages.use-case.ts` | `execute(profileId, role, disputeId)` | Dispute lookup: branch by role. |
| `use-cases/mark-as-read.use-case.ts` | `execute(profileId, role, disputeId)` | Dispute lookup: branch by role. |

**Controller** `support.controller.ts`: extract `user.role`, pass to all facade calls.

---

## 16. Notification Module

**Entity** `src/modules/notification/infrastructure/persistence/entities/notification.entity.ts`
```ts
@Entity({ name: 'notification', schema: 'public' })
export class Notification {
  // Remove: @ManyToOne(() => User) user: User;
  @Column({ nullable: true }) client_id: number | null;
  @Column({ nullable: true }) expert_id: number | null;
  @Column({ nullable: true }) agent_id: number | null;
  @Column({ type: 'text', nullable: true }) admin_id: string | null;

  @ManyToOne(() => ClientProfile, { nullable: true }) @JoinColumn({ name: 'client_id' }) client: ClientProfile | null;
  @ManyToOne(() => ExpertProfile, { nullable: true }) @JoinColumn({ name: 'expert_id' }) expert: ExpertProfile | null;
  @ManyToOne(() => AgentProfile, { nullable: true }) @JoinColumn({ name: 'agent_id' }) agent: AgentProfile | null;
}
```

### Notification Facade + Use-cases

| File | Method | Change |
|------|--------|--------|
| `use-cases/create-notification.use-case.ts` | `execute(profileId, role, type, title, message, meta)` | `create({ user_id: profileId })` → set the correct column based on role. For admin, set `admin_id: betterAuthUserId`. |
| `use-cases/get-notifications.use-case.ts` | `execute(profileId, role)` | `where: { user_id: profileId }` → branch by role column. |
| `use-cases/get-notifications.use-case.ts` | `getUnreadCount(profileId, role)` | Same branching. |
| `use-cases/mark-as-read.use-case.ts` | `execute(id, profileId, role)` | `{ id, user_id: profileId }` → branch by role column. |
| `use-cases/clear-all-notifications.use-case.ts` | `execute(profileId, role)` | `delete({ user_id: profileId })` → branch by role column. |

**Callers to update:** Every place that calls `notificationFacade.create(userId, ...)` must now pass `role` as well. Search:
```bash
grep -rn "notificationFacade.create\|NotificationFacade" src/ --include="*.ts"
```

---

## 17. Admin Module

**Entity** `src/modules/admin/infrastructure/persistence/entities/admin-audit-log.entity.ts`
```ts
@Entity({ name: 'audit_log', schema: 'admin' })
export class AdminAuditLog {
  // Remove: @ManyToOne(() => User) admin: User;
  @Column({ type: 'text' }) admin_id: string; // Better Auth UUID — public.user.id
}
```

### Use-cases

**`use-cases/update-withdrawal-status.use-case.ts`** — `execute(id, status, adminBaUserId, remark)`
- `admin_id` is now TEXT — pass `adminBaUserId` (the Better Auth UUID from `req.user.id`) directly.
- Wallet refund lookup: use `withdrawal.expert_id` to find the expert wallet instead of `user_id`.

**`use-cases/get-expert-detail.use-case.ts`** — `execute(betterAuthUserId)`
- Remove `UsersFacade.findById`. Look up the expert profile directly: `ExpertProfile.findOneBy({ better_auth_user_id: betterAuthUserId })`.
- For name/email in the response, join `public.user` in the query builder:
  ```ts
  expertProfileRepo.createQueryBuilder('ep')
    .innerJoin('"user"', 'u', 'u.id = ep.better_auth_user_id')
    .addSelect(['u.name', 'u.email'])
    .where('ep.better_auth_user_id = :id', { id: betterAuthUserId })
    .getOne()
  ```
- Pass `role: 'expert'` to `walletFacade.getTotalEarnings`.

**`use-cases/get-filtered-users.use-case.ts`** — `buildBaseQuery(filters)` / `applyComplexFilters()`
- Replace `User.createQueryBuilder('user')` with a raw query builder starting from `public.user`:
  ```ts
  dataSource.createQueryBuilder()
    .from('"user"', 'u')
    .where('u.role = :role', { role: 'client' })
  ```
- Subqueries that previously joined `chat_sessions.user_id = user.id` must now bridge through `client.profile`:
  ```sql
  -- old
  WHERE session.user_id = user.id
  -- new
  JOIN client.profile cp ON cp.better_auth_user_id = u.id
  WHERE session.client_id = cp.id
  ```
- `applyComplexFilters` enrichment queries: same bridge pattern for session counts and order counts.

**`use-cases/get-agents.use-case.ts`** — `execute(params)`
- Replace `User.createQueryBuilder` with `dataSource.createQueryBuilder().from('"user"', 'u').where('u.role = :role', { role: 'agent' })`.
- Join `AgentProfile`: `.leftJoinAndMapOne('u.agentProfile', AgentProfile, 'ap', 'ap.better_auth_user_id = u.id')`.

**`use-cases/get-admin-listings.use-case.ts`** — `execute(params)`
- Table is now `agent.listing`. `leftJoinAndSelect('listing.agent', 'agent')` — `agent` relation now loads `AgentProfile`.
- To include agent name/email in the response, add a further raw join:
  ```ts
  .innerJoin('"user"', 'u', 'u.id = agent.better_auth_user_id')
  .addSelect(['u.name', 'u.email'])
  ```

**`use-cases/create-agent.use-case.ts`** — `execute(dto, files)`
- Currently creates a NestJS `User` record directly — this must move to Better Auth.
- **Use Better Auth admin client:**
  ```ts
  // Requires Better Auth admin plugin (already enabled)
  const { user } = await authClient.admin.createUser({
    email: dto.email,
    password: dto.password,
    name: dto.name,
    role: 'agent',
  });
  // Then create AgentProfile in NestJS with the returned user.id
  await agentProfileRepo.save({ better_auth_user_id: user.id, ...dto });
  ```

**`use-cases/assign-coupon-bulk.use-case.ts`** — `execute(couponCode, filters)`
- `GetFilteredUsersUseCase` now returns rows from `public.user`. For each result, resolve `ClientProfile` by `better_auth_user_id` and use `client_id` in `ClientCoupon`.

**Controller** `admin.controller.ts`:
- `updateWithdrawalStatus(id, admin, body)`: `admin.id` from the guard is already the Better Auth UUID — pass directly as `admin_id`.

**`use-cases/get-user-stats.usecase.ts`** / **`get-expert-stats.usecase.ts`** / **`get-user-expert-growth-stats.usecase.ts`**:
- Replace `User.count({ where: { role: 'client' } })` with `dataSource.createQueryBuilder().from('"user"', 'u').where('u.role = :role', { role: 'client' }).getCount()`.
- Growth stats: same — group `u.createdAt` by date using raw query builder on `public.user`.

---

## 18. Auth Module

**File:** `src/modules/auth/application/use-cases/agent-register-user.usecase.ts`

| Current | Change |
|---------|--------|
| `UsersFacade.findByEmail(dto.email)` → check existence | Use Better Auth admin client: `authClient.admin.listUsers({ searchField: 'email', searchValue: dto.email })` — or query `public.user` directly: `dataSource.createQueryBuilder().from('"user"', 'u').where('u.email = :email').getOne()` |
| `UserRepository.findByBetterAuthId(agentBetterAuthId)` → get agent | `AgentProfile.findOneBy({ better_auth_user_id: agentBetterAuthId })` |
| `create(User, { role, uid, better_auth_user_id })` → create NestJS user | **Remove** — user creation is handled by Better Auth. The `databaseHooks.user.create` callback (section 20) triggers NestJS profile creation automatically. |
| `create(ProfileExpert/ProfileClient, { better_auth_user_id })` | Keep — profile is still created in NestJS |
| `AgentProfile.update({ registered_user_ids })` | Store `better_auth_user_id` strings instead of User int PKs |

---

## 19. Users Module — Delete

The `modules/users/` module wraps the dropped `users` table. Every use-case is replaced as follows:

| Use-case | Replacement |
|----------|-------------|
| `FindUserUseCase.findById(betterAuthUserId)` | `dataSource.createQueryBuilder().from('"user"', 'u').where('u.id = :id').getOne()` |
| `FindUserUseCase.findByBetterAuthId(id)` | Same as above — `id` is already the Better Auth UUID |
| `FindUserUseCase.findByEmail(email)` | `dataSource.createQueryBuilder().from('"user"', 'u').where('u.email = :email').getOne()` |
| `FindUserUseCase.findAll()` | `dataSource.createQueryBuilder().from('"user"', 'u').getMany()` |
| `CreateUserUseCase.execute(dto)` | Handled by `databaseHooks.user.create` in auth-server (section 20) |
| `AssignRoleUseCase.execute(userId, role)` | **Better Auth admin client:** `authClient.admin.setRole(userId, role)` |
| `GetUserStatsUseCase` | `dataSource.createQueryBuilder().from('"user"', 'u').where('u.role = :role', { role: 'client' }).getCount()` |
| `GetExpertStatsUseCase` | Same pattern for `role = 'expert'`; join `expert.profile` for KYC counts |
| `GetUserExpertGrowthStatsUseCase` | Raw query on `public.user` grouped by `DATE(u."createdAt")` |
| `FindUsersByRoleUseCase` | `dataSource.createQueryBuilder().from('"user"', 'u').where('u.role = :role').getMany()` |
| `DeleteUserUseCase` | **Better Auth admin client:** `authClient.admin.removeUser(userId)` |
| `BlockUserUseCase` / `UnblockUserUseCase` | **Better Auth admin client:** `authClient.admin.banUser(userId)` / `authClient.admin.unbanUser(userId)` |

All of the above raw queries on `public.user` can be extracted into a shared helper in the module that calls them (admin module in most cases). There is no need for a dedicated users module once callers are updated.

**Delete** `src/modules/users/` after migrating all callers.

---

## 20. Auth-Server: Add `databaseHooks`

**File:** `auth-server/src/auth.ts`

```ts
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        await fetch(`${process.env.BACKEND_URL}/internal/profile/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.INTERNAL_SECRET,
          },
          body: JSON.stringify({
            better_auth_user_id: user.id,
            role: user.role ?? 'client',
            email: user.email,
            name: user.name,
          }),
        });
      },
    },
  },
},
```

**New NestJS endpoint:** `POST /internal/profile/init` (guarded by `INTERNAL_SECRET` header):
1. Read `role` from payload
2. Create `client.profile`, `expert.profile`, or `agent.profile` with `better_auth_user_id`
3. Create a `finance.wallet` linked to the new profile
4. Never expose this endpoint in public Swagger docs

---

## 21. Module `TypeOrmModule.forFeature` — Cleanup Checklist

Run this after all entity changes:
```bash
grep -rn "TypeOrmModule.forFeature" src/ --include="*.module.ts"
```

For each module:
- Remove `User` / `UserEntity` from every `forFeature([...])` array
- Add `ClientProfile`, `ExpertProfile`, or `AgentProfile` where profile resolution is needed
- Modules that query `public.user` (admin, auth) use `DataSource.createQueryBuilder` with a raw table reference — no entity registration needed

---

## 22. Final Search Checklist

```bash
# Dropped table/entity references
grep -rn "UserEntity\|from.*user\.entity\|InjectRepository(User)" src/ --include="*.ts"

# Old column names in queries
grep -rn '"user_id"\|user_id:\|\.user_id' src/ --include="*.ts" | grep -v entity | grep -v migration

# Old table names in raw queries or query builders
grep -rn "profile_clients\|profile_experts\|agent_profiles\|chat_sessions\|call_sessions\|product_orders\|user_coupons\|support_disputes\|admin_audit_logs" src/ --include="*.ts"

# Relations loading dropped User
grep -rn "'user'\|\"user\"\|relations.*user" src/ --include="*.ts" | grep -v better_auth

# Wallet calls missing role parameter
grep -rn "walletFacade\." src/ --include="*.ts"

# Notification calls missing role parameter
grep -rn "notificationFacade\.create" src/ --include="*.ts"
```
