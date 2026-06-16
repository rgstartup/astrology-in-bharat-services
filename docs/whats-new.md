# Kya Badla? — Finance Module Refactor

## TL;DR

Wallet ek folder mein tha, ab `finance/` ke andar hai. Commission engine naya bana. Ledger bhi add hua. Sab kuch ek jagah.

---

## Folder Structure Badla

**Pehle:**
```
src/modules/wallet/
```

**Ab:**
```
src/modules/finance/
  ├── wallet/          ← same wallet, naye location pe
  ├── commissions/     ← naya commission engine
  └── finance.module.ts
```

> Import paths update ho gaye — `@/modules/wallet/...` → `@/modules/finance/wallet/...`

---

## Kya Naya Aaya?

### 1. CommissionsModule

`src/modules/finance/commissions/` — ek poora naya subdomain.

Isme hai:
- **`CommissionRule` entity** — flexible rule config (rate, caps, tiers, party override)
- **`CommissionTier` entity** — tiered rate bands
- **`LedgerEntry` entity** — har settlement ka financial journal
- **`CommissionsFacade`** — ek entry point sab ke liye

### 2. CommissionsFacade — Use This

```typescript
import {
  CommissionsFacade,
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
} from '@/modules/finance/commissions/application/commissions.facade';
```

Main methods:

```typescript
// Commission amount resolve karo
commissionsFacade.resolveCommission(
  CommissionEventType.CHAT,        // chat | call | puja | product_order
  CommissionType.PLATFORM_FEE,     // platform_fee | seller_agent | buyer_agent | gst
  profileId,                       // specific profile ID (null = global rule use hoga)
  CommissionAppliesRole.EXPERT,    // expert | merchant | client | agent | all
  grossAmount,                     // kitne pe calculate karna hai
)
// Returns: { amount: number, ruleId: string | null }

// Admin rules manage karo
commissionsFacade.createRule(dto)
commissionsFacade.updateRule(id, dto)
commissionsFacade.deactivateRule(id)
commissionsFacade.listRules(query)

// Ledger entry likho (settlement ke time)
commissionsFacade.createLedgerEntry(input, queryRunner?)

// Ledger padho
commissionsFacade.getLedger(query)
commissionsFacade.getLedgerSummary(query)
```

---

## Kaun Kaunse Module Badle?

### Settlement Use-Cases (actual money move hota hai)

| Use-Case | Kya badla |
|---|---|
| `end-chat` | `system_settings` direct read → `commissionsFacade.resolveCommission()` |
| `end-call` | Same |
| `update-puja-appointment-status` | Same |
| `update-order-status` | Same |

Yeh sab ab `CommissionsFacade` ke through commission lete hain — rules engine full apply hota hai.

### Agent Module

| Use-Case | Kya badla |
|---|---|
| `settle-agent-commissions` | `SystemSetting` repo inject → `CommissionsFacade` inject. Calculation async hai ab — har user ke liye `resolveCommission()` call hoti hai. |
| `get-agent-stats` | Commission rates display ke liye `resolveCommission(100)` call hoti hai (100 units pe resolve = effective rate% directly milta hai) |

### Merchant Dashboard

| Use-Case | Kya badla |
|---|---|
| `get-merchant-stats` | `walletFacade.getAdminCommissionFromSetting()` → `commissionsFacade.resolveCommission()` |
| `get-merchant-finance-stats` | Same, plus merchant-specific profileId pass hota hai (individual rule match possible) |

---

## Apne Module Mein Kaise Use Karein?

### Step 1 — Module Import Karo

```typescript
// your-module.module.ts
import { CommissionsModule } from '@/modules/finance/commissions/commissions.module';

@Module({
  imports: [CommissionsModule],
  // ...
})
```

### Step 2 — Facade Inject Karo

```typescript
import { CommissionsFacade, CommissionEventType, CommissionType, CommissionAppliesRole } from
  '@/modules/finance/commissions/application/commissions.facade';

@Injectable()
export class MyUseCase {
  constructor(private readonly commissionsFacade: CommissionsFacade) {}

  async execute(grossAmount: number, expertProfileId: string) {
    const { amount } = await this.commissionsFacade.resolveCommission(
      CommissionEventType.CHAT,
      CommissionType.PLATFORM_FEE,
      expertProfileId,
      CommissionAppliesRole.EXPERT,
      grossAmount,
    );
    // amount = actual commission ₹ in rupees, caps + tiers already applied
  }
}
```

### Step 3 — Admin Se Rule Banao (via API)

```http
POST /api/v1/admin/commissions/rules
Authorization: Bearer <admin-token>

{
  "name": "Standard Chat Platform Fee",
  "event_type": "chat",
  "commission_type": "platform_fee",
  "rate": 3,
  "applies_to_role": "all",
  "max_cap": 500,
  "is_active": true
}
```

---

## Display Rate Chahiye? (Stats/Dashboard ke liye)

`resolveCommission` ko `grossAmount=100` pass karo — response mein `amount` directly percentage value hai:

```typescript
const { amount: ratePercent } = await commissionsFacade.resolveCommission(
  CommissionEventType.CHAT,
  CommissionType.SELLER_AGENT,
  null,
  CommissionAppliesRole.EXPERT,
  100,   // ← 100 units
);
// ratePercent = 3 means 3% (kyunki 3% of 100 = 3)
```

---

## Kuch System Pehle Jaisa Hi Hai

- `admin.system_settings` mein purane keys abhi bhi hain — ye **fallback** hai
- Koi rule set nahi? → old settings se rate lo automatic
- `WalletFacade.getAdminCommissionFromSetting()` abhi bhi exist karta hai (legacy code ke liye)
- Koi breaking change nahi frontend ya existing APIs mein

---

## Quick Sanity Check

Commission rule kaam kar raha hai ya nahi check karna ho toh:

```sql
-- Active rules dekhne ke liye
SELECT name, event_type, commission_type, rate, max_cap, applies_to_role
FROM finance.commission_rules
WHERE is_active = true
ORDER BY priority DESC;

-- Latest ledger entries
SELECT reference_type, gross_amount, platform_fee, gst, provider_net
FROM finance.ledger_entries
ORDER BY created_at DESC
LIMIT 10;
```
