# Finance Flow — Paisa Kaise Move Karta Hai

## Kaun Kaun Hai System Mein?

| Role | Wallet Key | Table |
|---|---|---|
| Client | `client_id` | `client.profile` |
| Expert (Astrologer) | `expert_id` | `expert.profile` |
| Agent | `agent_id` | `agent.profile` |
| Merchant | `merchant_id` | `merchant.profile` |

> Platform ka apna wallet **nahi** hai. Platform ka paisa = jo client ne diya - jo baaki logon ko mila. Yeh `finance.ledger_entries` mein track hota hai.

---

## Kaunse Tables Matter Karte Hain?

| Table | Kya karta hai |
|---|---|
| `finance.wallets` | Har participant ka balance |
| `finance.transactions` | Har credit/debit ka record |
| `finance.ledger_entries` | Ek settlement ka poora split (audit ke liye) |
| `finance.commission_rules` | Commission rates, caps, tiers ka config |
| `finance.commission_tiers` | Volume-based tiered rates |
| `finance.payment_orders` | Razorpay payments |
| `finance.withdrawals` | Payout requests |
| `admin.system_settings` | Old key-value rates (fallback only) |

---

## Paisa Flow — Step by Step

### 1. Client Wallet Recharge Karta Hai

```
Client → Razorpay → Webhook verify
  → WalletFacade.topUp()
      → Transaction: CREDIT, purpose: RECHARGE
      → wallet.balance += amount
```

---

### 2. Chat Consultation

**Shuru hone pe (paise hold)**
```
InitiateChatUseCase
  → 5 minutes ka paisa HOLD ho jaata hai client ke wallet se
  → Transaction: HOLD, purpose: CONSULTATION
```

**Khatam hone pe (settle)**
```
EndChatUseCase
  ├── Billable = (actual_mins - free_mins) × price_per_min
  │
  ├── CommissionsFacade.resolveCommission() call karo:
  │     platform_fee  ← rule(event=chat, type=platform_fee, expert ka ID)
  │     gst           ← rule(event=chat, type=gst)
  │     seller_agent  ← rule(event=chat, type=seller_agent, expert ka ID) — agar expert referred hai
  │     buyer_agent   ← rule(event=chat, type=buyer_agent, client ka ID)  — agar client referred hai
  │
  ├── Split:
  │     expert_earning = total - platform_fee - gst - seller_agent - buyer_agent
  │
  ├── LedgerEntry likho (audit trail)
  │
  ├── Client ke wallet se kato (reserved se)
  ├── Expert ko credit karo
  └── Agent(s) ko commission credit karo
```

---

### 3. Call Consultation

Chat jaisa hi — bas billing per-second hoti hai (`price_per_min / 60 × seconds`).

---

### 4. Puja Appointment

```
Client CONFIRMS appointment
  UpdatePujaAppointmentStatusUseCase
    ├── Same split formula (event_type = puja)
    ├── LedgerEntry likho
    ├── Client se debit karo
    └── Expert + Agents ko credit karo
```

---

### 5. Product Order (Merchant)

```
Merchant marks order DELIVERED
  UpdateOrderStatusUseCase (har item ke liye separately)
    ├── itemTotal = price × quantity
    ├── resolveCommission(event=product_order, ...) for each commission type
    ├── merchantNet = itemTotal - platform_fee - gst - agents
    ├── LedgerEntry likho
    └── Merchant + Agents ko credit karo

Agar CANCELLED (already DELIVERED tha):
  → Client ko refund
  → Merchant se debit
```

---

### 6. Agent Payout

```
Agent withdrawal request karta hai
  → Admin approve karta hai
  → Razorpay payout initiate hoti hai
  → wallet.balance -= amount
```

---

## Commission Kaise Resolve Hota Hai?

```
1. finance.commission_rules mein dhundho (active, date valid)
   Priority order:
     a. Specific profile ID match  ← sabse zyada specific (individual deal)
     b. Role match (expert/merchant/client)
     c. 'all' — global rule

2. Agar tiers hain → gross amount ke hisaab se tier chunno

3. Rate apply karo (percentage ya fixed ₹)

4. Min/max cap apply karo

5. Koi rule nahi mila? → admin.system_settings se fallback
```

---

## Platform Ko Kitna Milta Hai?

```
platform_net = platform_fee + gst
```

Yeh `finance.ledger_entries.platform_net` mein har settlement ke saath likha jaata hai.

---

## Golden Rule (invariant)

```
gross_amount = provider_net + platform_fee + gst + seller_agent + buyer_agent
```

Agar yeh equation balance nahi karti — kuch galat hai.
