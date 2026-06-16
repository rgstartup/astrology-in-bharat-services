# Profile Migration Changelog

**Date:** 2026-06-14 to 2026-06-15  
**Branch:** `feat/profileUse`  
**Commits:** 20 commits across 21 files → 300+ files touched total

---

## Overview

Platform-wide migration from `userId`-based to `profileId`-based identity and resource ownership.

Previously, all resources (orders, chats, calls, todos, bank accounts, notifications, etc.) were scoped to `User.id`. The new model treats **profile entities** as the authoritative identity:

| Role | Profile Entity |
|---|---|
| `client` | `ProfileClient` |
| `expert` | `ProfileExpert` |
| `merchant` | `ProfileMerchant` |
| `agent` | `ProfileAgent` |

The JWT `profile` field carries the active profileId for the logged-in role. The `@CurrentProfile()` decorator extracts it in controllers. `ProfileType` is defined as `Exclude<RoleEnum, RoleEnum.ADMIN>`.

---

## Commits

### 1. `CurrentUser` Decorator — Type & Payload Update
**Commits:** `6a4f88a`, `1f45464` | 32 files

Updated `@CurrentUser()` to return a typed `IUser` with `id`, `email`, `roles[]`, and `profile` (active profileId). Cascaded the interface change across 29 files.

**Impact:** No behavioral change — internal type safety improvement.

---

### 2. Global `profileId` Rollout (First Wave)
**Commit:** `cb1b36c` | 66 files

- Introduced `@CurrentProfile()` decorator across all module controllers.
- Controllers stop passing `user.id` to facades and start passing `user.profile` (profileId).
- Facades and use-cases updated to accept `profileId` in place of `userId`.

**APIs affected (now internally scoped to profileId):**
- Expert profile, client profile, wallet, earnings, cart, wishlist, chat, call, orders, payment, todos, bank accounts, disputes, notifications.

---

### 3. Agent Profile Module — profileId Cascade
**Commit:** `2fec9a1` | 8 files

- `IUser` fully threaded through agent profile use-cases.
- Profile lookups use `user.profile` (agent profileId) as the primary key, falling back to `user.id` if profile not set.

**APIs affected:**
- `GET/PUT /agent/profile`
- Agent bank account operations

---

### 4. Merchant Profile Module — profileId Cascade
**Commit:** `e3eab41` | 4 files

- Same pattern as agent: `IUser` passed through update use-case, profile resolved via `user.profile` (merchant profileId).

**APIs affected:**
- `PUT /merchant/profile`

---

### 5. Commerce Module — Order & Coupon Migration
**Commit:** `ef90744` | 65 files *(largest commit)*

- `Order.client_id` now references `ProfileClient.id` instead of `User.id`.
- `GetUserOrdersUseCase`, `MarkOrderAsPaidUseCase`, `UpdateOrderStatusUseCase`, `CreateOrderFromCartUseCase` operate on `client_id` as a profile FK.
- Coupon redemption operates on client profileId.
- Cart operations (`add-to-cart`, `get-cart`, `clear-cart`) tied to client profileId.
- Real-time socket events (`order_status_updated`) emitted to `profile_${profileId}` rooms.

**APIs affected:**
- `GET /orders/my` — returns orders for the authenticated client profile
- `POST /orders` — creates order under client profileId
- `PATCH /orders/:id/status` — notifies client profile socket
- `POST /coupons/apply` — validates coupon against client profileId
- `GET/POST /cart`, `DELETE /cart/clear` — scoped to client profileId

---

### 6. Call Module — profileId Migration
**Commit:** `aed069a` | 6 files

- `CallSession.client_id` and `expert_id` now reference profile IDs.
- `InitiateCallUseCase`, `AcceptCallUseCase`, `EndCallUseCase` operate on profile IDs.
- End-of-call notification sent to `client_id` (ProfileClient) instead of `user_id`.

**APIs affected:**
- `POST /call/initiate` — requires active client/expert profiles
- `POST /call/accept` — validates by expert profileId
- `POST /call/end` — sends consultation summary notification to client profile

---

### 7. Chat Module — profileId Migration
**Commit:** `d361079` | 16 files

- `ChatSession.client_id`, `expert_id` now reference profile IDs.
- All chat use-cases (`InitiateChat`, `EndChat`, `SaveMessage`, `GetMessages`, `GetSession`, `FindClientSessions`, `FindExpertSessions`) operate on profile IDs.
- End-of-chat notification sent to `client_id` (ProfileClient).

**APIs affected:**
- `POST /chat/initiate` — books session under client/expert profile IDs
- `POST /chat/end` — sends consultation summary to client profile
- `GET /chat/sessions` — filtered by caller's profileId
- `GET /chat/messages/:sessionId` — access-checked by profileId

---

### 8. Reviews Module — profileId Migration
**Commit:** `e70ab73` | 5 files

- `Review.client_id`, `expert_id` reference profile IDs.
- `CreateReviewUseCase`, `GetExpertReviewsUseCase` operate on profile IDs.
- Admin review-response notification sent to `expert.id` (ProfileExpert), not `expert.user.id`.

**APIs affected:**
- `POST /reviews` — review stored under client/expert profile IDs
- `GET /reviews/expert/:id` — fetched by expert profileId

---

### 9. Bank Accounts Module — profileId Migration
**Commit:** `08f6505` | 8 files

- All bank account use-cases (`Create`, `Get`, `List`, `Remove`, `SetPrimary`, `Update`) scoped to `expert_id` (ProfileExpert).
- Controller uses `@CurrentProfile()`.

**APIs affected:**
- `GET/POST /bank-accounts` — lists/creates accounts for the authenticated expert profile
- `DELETE /bank-accounts/:id` — removes account owned by expert profile
- `PATCH /bank-accounts/:id/primary` — sets primary for expert profile

---

### 10. Todos Module — profileId Migration
**Commit:** `f14345a` | 7 files

- `Todo.expert_id` references `ProfileExpert.id`.
- All CRUD use-cases operate on expert profileId.

**APIs affected:**
- `GET/POST /todos` — scoped to authenticated expert profile
- `PATCH/DELETE /todos/:id` — validated against expert profileId

---

### 11. Wallet & Expert Dashboard — profileId Migration
**Commit:** `8537fa8` | 28 files

- All wallet use-cases operate on profile IDs via `WalletKey` (`client_id | expert_id | merchant_id | agent_id`).
- Expert dashboard stats and earnings use-cases use expert profileId.

**APIs affected:**
- `GET /wallet/balance` — returns balance for the authenticated profile's wallet
- `GET /wallet/transactions` — transactions scoped to profileId
- `POST /wallet/top-up` — credits client profile wallet
- `GET /expert/dashboard/stats` — stats for expert profileId
- `GET /expert/earnings` — earnings for expert profileId

---

### 12. Expert Dashboard — Cleanup
**Commit:** `1780e6a` | 2 files

Minor cleanup after profileId wiring; removed redundant lines.

---

### 13. Wallet — Withdrawal & Credit Fix
**Commit:** `50ac8ab` | 3 files

- `RequestWithdrawalUseCase`: uses `profileId` directly for notification — removed the extra DB query to resolve `user_id`.
- `CreditUseCase`: RECHARGE notification now goes to client profileId, not resolved `user_id`.

---

### 14. Payment Module — profileId Migration
**Commit:** `0d2e1fe` | 3 files

- `CreatePaymentOrderUseCase` accepts client profileId for wallet top-up flow.

**APIs affected:**
- `POST /payment/create-order` — uses profileId to create Razorpay order and top up wallet

---

### 15. Notification Module — Schema & Full Migration
**Commit:** `9ed9d4e` | 21 files

Core schema change plus all downstream callers updated.

**Entity change:**

`Notification.user_id` / `user` FK replaced with four nullable profile FKs — exactly one set per row:

```
client_id  → ProfileClient
expert_id  → ProfileExpert
merchant_id → ProfileMerchant
agent_id   → ProfileAgent
```

**Other changes:**
- `ProfileType = Exclude<RoleEnum, RoleEnum.ADMIN>` — tied to `RoleEnum` enum values
- Use-cases switch on `profileType` (`RoleEnum` values) to query the correct FK column
- Controller: `@CurrentProfile()` + `deriveProfileType(roles)` resolves both profileId and profileType
- Gateway: socket rooms re-keyed `user_${userId}` → `profile_${profileId}`; `emitToUser` → `emitToProfile`
- All 13 external callers (wallet, orders, consultation, puja, merchant, agent) pass profile IDs + `RoleEnum` values
- Fixed `razorpay.provider.ts`: `receiptId` → `receipt`

**APIs affected:**
- `GET /notifications` — returns notifications for authenticated profile only
- `GET /notifications/unread-count` — count for authenticated profile
- `PATCH /notifications/:id/read` — marks as read
- `DELETE /notifications/all` — clears all for authenticated profile
- **WebSocket:** clients must send `{ profileId }` on `register_user` event (was `{ userId }`)

---

### 16. Support Module — profileId Migration
**Commit:** `9429059` | 10 files

- Dispute use-cases (`CreateDispute`, `GetDisputes`, `SendMessage`, `MarkAsRead`) scoped to profile IDs.

**APIs affected:**
- `POST /support/disputes` — dispute created under profileId
- `GET /support/disputes` — filtered by caller's profileId
- `POST /support/disputes/:id/messages` — sender identified by profileId

---

### 17. Puja Appointment Module — profileId Migration
**Commit:** `10eeb18` | 8 files

- `PujaAppointment.client_id`, `expert_id` reference profile IDs.
- Authorization checks compare `operatingProfileId` against `appointment.expert_id` / `appointment.client_id` directly — no user lookup.

**APIs affected:**
- `POST /puja-appointments` — creates appointment under client/expert profile IDs
- `PATCH /puja-appointments/:id/status` — authorizes by profileId match
- `GET /puja-appointments/expert` — filtered by expert profileId
- `GET /puja-appointments/user` — filtered by client profileId

---

### 18. Consultation Module — Final Cleanup
**Commit:** `f2bb0f6` | 9 files

Final pass on consultation controllers (chat + call) to remove any remaining `user.id` references and fully switch to `@CurrentProfile()`.

**APIs affected:** Same as commits 6 and 7 — no new endpoints, behavioral consolidation.

---

## Breaking Changes for Frontend / API Clients

| Area | Before | After |
|---|---|---|
| Notification WebSocket registration | `emit('register_user', { userId })` | `emit('register_user', { profileId })` |
| Socket rooms | `user_${userId}` | `profile_${profileId}` |
| All resource APIs | Scoped to `user.id` (from JWT `sub`) | Scoped to JWT `profile` field — must be set at login |

> **Note:** The JWT `profile` field is populated at login based on the user's active role. Any session token issued before this migration will not have the `profile` field and will receive `401 Unauthorized` on profile-gated endpoints. Users must re-authenticate.

---

## Architecture Reference

```
JWT Payload
  sub    → User.id
  roles  → ['client'] | ['expert'] | ...
  profile → ProfileClient.id | ProfileExpert.id | ...

@CurrentUser()  → IUser { id, email, roles, profile }
@CurrentProfile() → string (profileId, throws 401 if missing)
```

`ProfileType` is `Exclude<RoleEnum, RoleEnum.ADMIN>` = `'client' | 'expert' | 'merchant' | 'agent'`
