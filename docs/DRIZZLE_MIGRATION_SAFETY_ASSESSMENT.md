# TypeORM to Drizzle Migration Safety Assessment & Roadmap

> **Single Source of Truth for Backend ORM Migration**
> **Last updated:** 2026-10-09
> **Status:** In Progress (Module-by-Module Gradual Migration)

---

## 1. Migration Protocol & Architectural Invariants

Per project rules and `.wolf/cerebrum.md`:
1. **Drizzle-Only:** All new backend persistence code MUST use Drizzle (`drizzle-orm`, `drizzle-kit` migrations, `src/core/drizzledb/schema/`).
2. **`snake_case` Strictly Enforced:** All table and column names in schema declarations and SQL queries must use `snake_case` (no camelCase).
3. **1 File Per Entity:** Schema files are organized strictly 1 file per entity in domain subdirectories (`src/core/drizzledb/schema/<domain>/<entity>.schema.ts`).
4. **Tree-Shakeable Barrels:** No `export *` wildcard re-exports; use explicit named exports and type-only exports (`export type { ... }`).
5. **No Entity Imports in Schemas:** Drizzle schemas must never import from `*.entity.ts` to prevent circular dependencies and `drizzle-kit generate` crashes.
6. **Shared QueryRunner Scope Rule:** Never migrate a use-case whose `QueryRunner` is passed in from a still-TypeORM caller module (e.g. `order` -> `wallet` -> `payments`). Migrate standalone reads first, and migrate shared-transaction groups atomically when moving to `DrizzleTx`.

---

## 2. Migration Safety Assessment Matrix

```
+-------------------------------------------------------------------------------+
|                             MIGRATION TIERS                                  |
+-------------------------------------------------------------------------------+
|  🟢 TIER 1: Immediate Standalone Leaf Modules                                  |
|     - Zero cross-domain FKs, zero shared transactions, isolated CRUD.          |
|     - Festivals, Quotes, Places, Locations, Calendar Cache, Prokerala, Todos   |
+-------------------------------------------------------------------------------+
|  🟡 TIER 2: Schema Ready (Drizzle Schema Exists, Migrate Use-Cases)           |
|     - Schemas already in src/core/drizzledb/schema/.                           |
|     - Coupons, Reviews, Merchant Account, Earnings, Commissions               |
+-------------------------------------------------------------------------------+
|  🔵 TIER 3: High-Value Unblocking Domains                                     |
|     - Unblocks residual TypeORM queries in commerce/order and admin.          |
|     - Admin System Settings & Audit Logs, Support Disputes, Expert Bank Accs   |
+-------------------------------------------------------------------------------+
|  🔴 TIER 4: Coupled / Transaction-Bound Groups (Migrate Atomically)           |
|     - Shared QueryRunner or awaiting removal.                                 |
|     - Group A: Order / Wallet / Payments (Shared Tx)                          |
|     - Group B: Legacy Consultation Chat/Call (Marked for Deletion)            |
|     - Group C: Core Users & Legacy Auth (Wide FK Dependency Graph)            |
+-------------------------------------------------------------------------------+
```

---

## 3. Detailed Inventory by Tier

### 🟢 Tier 1: Immediate Standalone Leaf Modules

Modules with no inbound or outbound TypeORM relations. Can be migrated immediately without risking runtime regressions.

| Module | Location | TypeORM Entities | Use Cases | Next Actions |
|---|---|---|---|---|
| **Festival** | `src/internal/festival/` | `Festival` (`festivals`) | 5 CRUD use-cases | Create `festival.schema.ts`, rewrite 5 use-cases to Drizzle, drop `TypeOrmModule`. |
| **Quotes** | `src/internal/quotes/` | `Quote` (`quotes`) | 5 CRUD use-cases | Create `quotes.schema.ts`, rewrite 5 use-cases to Drizzle, drop `TypeOrmModule`. |
| **Places** | `src/internal/places/` | `Place`, `PlaceImage` (`places`, `place_images`) | 4 use-cases + cron + Serper cache | Create `places.schema.ts`, rewrite 4 use-cases to Drizzle. |
| **Locations** | `src/internal/locations/` | `StateEntity`, `DistrictEntity` (`states`, `districts`) | 1 seed use-case | Create `locations.schema.ts`, update seed use-case. |
| **Calendar** | `src/internal/calendar/` | `CalendarCache` (`calendar_cache`) | 4 use-cases + Panchangam service | Create `calendar.schema.ts`, update cache reads/writes. |
| **Prokerala** | `src/external/prokerala/` | `ProkeralaCacheEntity` (`prokerala_cache`) | 1 service | Create `prokerala-cache.schema.ts`, update cache service. |
| **Todos** | `src/internal/actors/expert/todos/` | `Todo` (`expert_todos`) | 4 CRUD use-cases | Create `expert-todos.schema.ts`, rewrite 4 use-cases. |

---

### 🟡 Tier 2: Schema Ready (Drizzle Schema Already Generated)

Drizzle schema definitions already exist in `src/core/drizzledb/schema/`. Only use-case rewrites to inject `DRIZZLE` are needed.

| Domain / Feature | Drizzle Schema Location | Tables | Status |
|---|---|---|---|
| **Commerce Coupons** | `src/core/drizzledb/schema/commerce/coupon/` | `commerce.coupons`, `commerce.user_coupons` | ✅ **Completed** (20/20 tests green) |
| **Merchant Account & Auth** | `src/core/drizzledb/schema/merchant/` | `merchant.account`, `auth.sessions`, `users` | ✅ **Completed** (23/23 tests green) |
| **Finance Earnings** | `src/core/drizzledb/schema/finance/earnings/` | `earning_policies`, `earning_splits`, `earning_tiers` | ✅ **Completed** (9/9 tests green) |
| **Consultation Reviews** | `src/core/drizzledb/schema/consultation/reviews/` | `consultations.reviews` | ✅ **Completed** (17/17 tests green) |
| **Client Favorites** | `src/core/drizzledb/schema/client/` | `client.favorites` | ✅ **Completed** (11/11 tests green) |
| ~~**Finance Commissions**~~ | `src/core/drizzledb/schema/finance/commissions/` | `commission_rules`, `commission_splits`, `commission_tiers` | *Deprecated (BE-11)* — skipped |

---

### 🔵 Tier 3: High-Value Unblocking Candidates

Modules whose migration removes residual TypeORM dependencies across already-migrated boundaries.

| Target | Tables | Reason & Value |
|---|---|---|
| **Admin System Settings** | `admin.system_settings` | Unblocks [`merchant-order-queries.usecase.ts`](file:///home/rgstartup/AIB/project/backend/src/internal/commerce/order/use-cases/merchant-order-queries.usecase.ts) which still injects `Repository<SystemSetting>`. |
| **Admin Audit Logs** | `admin.admin_audit_logs` | Unblocks `toggle-user-block`, `create-sub-admin`, `delete-sub-admin`, and `update-sub-admin`. |
| **Support Disputes** | `support.disputes`, `support.dispute_messages` | Self-contained dispute management (8 use-cases + support gateway). |
| **Expert Bank Accounts** | `expert.bank_accounts` | 6 use-cases in `actors/expert/bank-accounts/`; `expertAccounts` table is in Drizzle. Marked `@deprecated` (BE-12). |

---

### 🔴 Tier 4: Transaction-Bound / Blocked Groups

Must NOT be migrated individually. Require grouped or coordinated changes.

#### Group A: Commerce & Finance Shared Transaction Group
- **Modules:** `commerce/order` writes (`create-order-from-cart`, `mark-as-paid`, `set-razorpay-id`), `finance/payments` (`verify-payment`, intent handlers), `finance/wallet` transactional writes (`recharge`, `debit`, `reserve`).
- **Blocker:** They pass a shared TypeORM `QueryRunner` across service boundaries during multi-domain checkout and recharge settlements.
- **Resolution Strategy:** Design and adopt `DrizzleTx` transaction context across `commerce/order` + `finance/wallet` + `finance/payments` in a synchronized migration epic.

#### Group B: Legacy Consultation Chat/Call Stack
- **Modules:** `src/internal/consultation/chat/` (31 files), `src/internal/consultation/call/` (27 files).
- **Blocker:** Both module stacks are marked `@deprecated` and slated for full deletion once `/realtime` socket flows and actor use-cases are authoritative.
- **Resolution Strategy:** Do NOT rewrite legacy code to Drizzle; delete directory when replacement is finalized.

#### Group C: Core Users & Legacy Auth Graph
- **Modules:** `src/internal/users/` and `src/internal/auth/`.
- **Blocker:** 34+ repository injections and 10+ TypeORM entity FK relations (`ClientAccount`, `ExpertAccount`, `MerchantAccount`, `AgentProfile`, `Session`, `Otp`, `OAuthAccount`, `UsedToken`, etc.).
- **Resolution Strategy:** Migrate actor-specific auth use-cases first (`actors/client/auth`, `actors/expert/auth` already on Drizzle). Keep `user.entity.ts` as a legacy shell for downstream TypeORM FKs until all referencing entities move to Drizzle.

---

## 4. Recommended Step-by-Step Rollout Plan

1. **Step 1 — Zero-Risk Standalone Leaf Migrations (Tier 1):**
   - Migrate `FestivalModule` (5 use-cases).
   - Migrate `QuotesModule` (5 use-cases).
   - Migrate `PlacesModule` (4 use-cases).
   - Migrate `ExpertTodosModule` (4 use-cases).
2. **Step 2 — Schema-Ready Use-Case Migrations (Tier 2):**
   - Migrate `CommerceCoupons` use-cases to Drizzle schema.
   - Migrate `ConsultationReviews` use-cases to Drizzle schema.
   - Migrate `MerchantAccount` use-cases to Drizzle schema.
3. **Step 3 — High-Value Unblockers (Tier 3):**
   - Create Drizzle schema for `admin.system_settings` + `admin.admin_audit_logs`.
   - Migrate admin settings use-cases and drop `Repository<SystemSetting>` from `commerce/order/use-cases/merchant-order-queries.usecase.ts`.
   - Migrate `SupportDisputes` and `ExpertBankAccounts`.
4. **Step 4 — Atomic Shared Transaction Migration (Tier 4 Group A):**
   - Migrate `commerce/order` write path + `finance/payments` + `finance/wallet` write path using `DrizzleTx`.
5. **Step 5 — Legacy Stack Deletion & User Shell Cleanup (Tier 4 Group B & C):**
   - Drop legacy `internal/consultation/chat` and `internal/consultation/call`.
   - Drop remaining TypeORM entities and `user.entity.ts`.
