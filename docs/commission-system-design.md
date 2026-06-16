# Commission System — Kya Hai, Kaise Kaam Karta Hai

## Pehle Kya Problem Tha?

Purana system mein commission rates aise store the:

```
COMMISION_FROM_ASTROLOGER = "3"
GST_PERCENTAGE = "18"
```

Yeh ek simple key-value store tha. Problems:

- **No caps** — ₹50,000 ka session = ₹1,500 commission? Too high, koi control nahi tha
- **No per-person deal** — Expert A ko 2% dena chahte ho? Nahi ho sakta, sirf ek global rate
- **No tiers** — Volume discount dena ho? Not possible
- **No time limit** — Festive season pe rate kam karna ho? Hard to do
- **No audit** — Kaunse rule ne kaunse settlement pe apply kiya? No idea

---

## Naya System — 3 Tables

### `finance.commission_rules` — Main Config

Ek rule = ek row.

| Column | Kya hai |
|---|---|
| `name` | Human-readable label — "Standard Platform Fee" |
| `event_type` | `chat / call / puja / product_order` |
| `commission_type` | `platform_fee / seller_agent / buyer_agent / gst` |
| `rate` | Percentage (3.00 = 3%) ya fixed ₹ amount |
| `rate_type` | `percentage` ya `fixed` |
| `min_cap` | Minimum ₹ commission (null = no floor) |
| `max_cap` | Maximum ₹ commission (null = no ceiling) |
| `applies_to_role` | `all / expert / merchant / client / agent` |
| `applies_to_id` | Specific profile UUID (null = sab pe laagu) |
| `priority` | Higher = pehle match hoga |
| `is_active` | Soft disable (delete mat karo) |
| `effective_from` | Kab se active |
| `effective_until` | Kab tak active (null = kabhi expire nahi) |

---

### `finance.commission_tiers` — Tiered Rates

Ek rule ke andar multiple bands. Gross amount ke hisaab se rate change hota hai.

| Column | Kya hai |
|---|---|
| `rule_id` | Kaunse rule ka tier hai |
| `from_amount` | Band ka lower limit |
| `to_amount` | Band ka upper limit (null = unbounded) |
| `rate` | Is band ka rate |
| `min_cap / max_cap` | Optional override caps for this tier |

---

### `finance.ledger_entries` — Financial Journal

Har settlement ke baad ek row. Platform ka audit trail.

| Column | Kya hai |
|---|---|
| `reference_id` | `chat_abc123`, `puja_appt_xyz`, `order_item_uvw` |
| `reference_type` | `chat / call / puja / order` |
| `gross_amount` | Client ne kitna diya |
| `platform_fee` | Platform ka cut (before GST) |
| `gst` | GST on platform fee |
| `seller_agent_commission` | Agent jo expert/merchant laya |
| `buyer_agent_commission` | Agent jo client laya |
| `provider_net` | Expert/Merchant ko kitna mila |
| `platform_net` | `platform_fee + gst` — platform ka actual revenue |

**Invariant:**
```
gross = provider_net + platform_fee + gst + seller_agent + buyer_agent
```

---

## Resolution Algorithm — Ek Line Mein

> Sabse specific rule jeetata hai. Koi rule nahi? Old system_settings se fallback.

Detail mein:

```
1. commission_rules dhundho:
   - event_type match
   - commission_type match
   - is_active = true
   - effective_from <= now <= effective_until

2. Specificity order:
   a. applies_to_id = profile_id  ← Individual deal (highest priority)
   b. applies_to_role = 'expert'  ← Role-level rule
   c. applies_to_role = 'all'     ← Global fallback

3. Tiers hain? → gross amount se tier match karo

4. Rate apply karo → caps lagao

5. Koi match nahi? → system_settings se legacy value lo
```

---

## Examples — Real Scenarios

### Basic global rate
```
Rule: chat, platform_fee, 3%, all
₹100 session → ₹3 platform fee
```

### Cap lagana
```
Rule: chat, platform_fee, 3%, max_cap=₹500
₹20,000 session → raw=₹600 → capped at ₹500
```

### Ek expert ke liye special deal
```
Rule A: chat, seller_agent, 2%, applies_to_id=<expert_XYZ>, priority=10
Rule B: chat, seller_agent, 5%, all, priority=0
Expert XYZ ke sessions → agent ko 2% milega, baaki sabko 5%
```

### Volume tiers (merchant orders)
```
Rule: product_order, platform_fee
Tiers:
  ₹0–999    → 5%
  ₹1000–4999 → 3%
  ₹5000+    → 2%, max_cap=₹2000

Order ₹1,200 → 3% tier → ₹36 platform fee
Order ₹8,000 → 2% tier → ₹160 platform fee
```

### Festive discount (time-bounded)
```
Rule: chat, platform_fee, 1%
effective_from: 2026-07-01
effective_until: 2026-07-31
→ July mein automatically 1% rate, August mein phir global rule apply hoga
```

---

## Backward Compatibility

- Purane `admin.system_settings` keys abhi bhi kaam karte hain
- Koi rule nahi mila → automatically old settings se fallback
- Gradually migrate kar sakte ho — koi breaking change nahi

---

## APIs

```
GET    /api/v1/admin/commissions/rules       — List sab rules
POST   /api/v1/admin/commissions/rules       — Naya rule banao
PATCH  /api/v1/admin/commissions/rules/:id   — Rule update karo
DELETE /api/v1/admin/commissions/rules/:id   — Soft delete (is_active=false)

GET    /api/v1/admin/finance/ledger          — Paginated ledger entries
GET    /api/v1/admin/finance/ledger/summary  — Totals by type + date range
```
