# Deprecation Inventory (backend + frontend)

> Companion to the OpenWolf task in `.wolf/backend-legacy-code-removal-instructions.md`.
> Elements below are intentionally **NOT being removed yet**. This document tracks
> dependencies, tags/keywords, and future cleanup work so removal can happen systematically.
>
> **Restore note (2026-10-08):** 52 files under
> `backend/src/internal/consultation/{chat,call}/` were temporarily reduced to
> 3-line `@deprecated` stubs in the working tree, which broke `pnpm build`
> (96 errors: `TS2306 ... is not a module` + `ESModulesLinkingError ... module
> has no exports`). Bodies were recovered verbatim via `git restore` from
> `backend/.git` (HEAD) — build is green again. 6 files in the same dirs were
> never stubbed (`chat/controllers/consultation.controller.ts`,
> `chat/dto/consultation-book.dto.ts`, `chat/enum.ts`, `call/enum.ts`,
> `call/errors/call.errors.ts`, `call/services/twilio.service.ts`) plus ~10
> legitimate in-progress edits outside these dirs were preserved. Nothing in
> this document modifies code.

## Tag Index / Keyword Index

Quick lookup by keyword:
- **`chat` / `realtime` / `socket`**: [BE-01](#be-01--legacy-chat-module-31-backend-files), [FE-02](#fe-02--client-libsocketts-monolith), [FE-03](#fe-03--client-libsocket-shims)
- **`call` / `twilio` / `webrtc`**: [BE-02](#be-02--legacy-call-module-27-files), [BE-13](#be-13--twilio-video-stack-externalvideo)
- **`avatar` / `media` / `video` / `cloudinary` / `storage`**: [BE-03](#be-03--avatar-url-columns-deprecated-for-avatar_id-media-fk), [BE-04](#be-04--expert-generic-upload-endpoints), [BE-05](#be-05--expert-legacy-video-column), [BE-06](#be-06--cloudinaryservice-facade), [FE-06/07/10](#fe-060710--deprecated-dto-fields-uidpublic_id-avataravatar_media-is_available)
- **`payment` / `razorpay` / `webhook`**: [BE-07](#be-07--validatewebhooksignature-optional-interface-method)
- **`expert` / `presence` / `availability`**: [BE-04](#be-04--expert-generic-upload-endpoints), [BE-05](#be-05--expert-legacy-video-column), [BE-08](#be-08--expert-is_available-flag), [BE-10](#be-10--expert-profile-module-expertprofilemodule-profilemodulets), [BE-12](#be-12--bankaccountsmodule-bank-accountsmodulets), [FE-09](#fe-09--client-useexpertpresence-shim)
- **`wishlist` / `favorites` / `commerce` / `like`**: [BE-09](#be-09--commerce-wishlist-module-wishlistmodulets)
- **`profile` / `discovery` / `kyc` / `puja`**: [BE-10](#be-10--expert-profile-module-expertprofilemodule-profilemodulets)
- **`auth` / `safe-fetch` / `balance` / `wallet`**: [FE-01](#fe-01--safe-fetch-legacy-tuple-api), [FE-08](#fe-08--client-refreshbalance-store-method)
- **`i18n` / `language`**: [FE-05](#fe-05--uselanguagestore)
- **`commissions` / `split` / `rule` / `tier`**: [BE-11](#be-11--commissions-module-commissionsmodulets)
- **`bank-account` / `bank` / `payout`**: [BE-12](#be-12--bankaccountsmodule-bank-accountsmodulets)
- **`typeorm`**: [BE-01](#be-01--legacy-chat-module-31-backend-files), [BE-02](#be-02--legacy-call-module-27-files), [BE-03](#be-03--avatar-url-columns-deprecated-for-avatar_id-media-fk), [BE-05](#be-05--expert-legacy-video-column), [BE-09](#be-09--commerce-wishlist-module-wishlistmodulets), [BE-10](#be-10--expert-profile-module-expertprofilemodule-profilemodulets), [BE-11](#be-11--commissions-module-commissionsmodulets), [BE-12](#be-12--bankaccountsmodule-bank-accountsmodulets)

---

## Summary

| Element | Type | File(s) | Difficulty | Dependencies | Tags | Status |
|---|---|---|---|---|---|---|
| BE-01 Legacy chat module | module group (31 files) | `internal/consultation/chat/**` | Hard | Multiple | `chat`, `realtime`, `consultation`, `typeorm`, `socket` | **Removed (2026-10-17)** |
| BE-02 Legacy call module | module group (27 files) | `internal/consultation/call/**` | Moderate | Multiple | `call`, `consultation`, `twilio`, `typeorm`, `webrtc` | **Removed (2026-10-17)** |
| BE-03 Avatar URL columns | columns/fields (8) | schemas + entities + DTOs | Moderate | Multiple | `avatar`, `media`, `user`, `account`, `profile`, `schema`, `typeorm`, `drizzle` | Tracked |
| BE-04 Expert generic upload endpoints | routes (2) | expert account.controller | Moderate | Internal | `expert`, `upload`, `media`, `cloudinary`, `controller` | Tracked |
| BE-05 Expert legacy `video` column | column | expert account.entity | Moderate | Unknown | `expert`, `video`, `media`, `account`, `schema` | Tracked |
| BE-06 CloudinaryService facade | service | `external/cloudinary/` | Easy | None | `cloudinary`, `storage`, `media`, `service`, `external` | Tracked |
| BE-07 `validateWebhookSignature` | method (optional) | payment-gateway.interface | Easy | Internal | `payment`, `razorpay`, `webhook`, `gateway`, `signature` | Tracked |
| BE-08 Expert `is_available` column | column | expert account (+docs) | Moderate | Multiple | `expert`, `availability`, `presence`, `account`, `schema` | Tracked |
| BE-09 WishlistModule | module (14 files) | `internal/commerce/wishlist/**` | Moderate | Multiple | `wishlist`, `commerce`, `favorites`, `like`, `typeorm`, `module` | Tracked, marked @deprecated 2026-10-09 |
| BE-10 ExpertProfileModule (`ProfileModule`) | module (22 files) | `internal/actors/expert/profile/**` | Moderate | Multiple | `expert`, `profile`, `discovery`, `account`, `puja`, `kyc`, `typeorm`, `module` | Tracked, marked @deprecated 2026-10-09 |
| BE-11 CommissionsModule | module (17 files) | `internal/finance/commissions/**` | Moderate | Multiple | `commissions`, `finance`, `split`, `rule`, `tier`, `typeorm`, `module` | Tracked, marked @deprecated 2026-10-09 |
| BE-12 BankAccountsModule | module (16 files) | `internal/actors/expert/bank-accounts/**` | Moderate | Multiple | `expert`, `bank-account`, `payout`, `typeorm`, `module` | Tracked, marked @deprecated 2026-10-12 |
| BE-13 Twilio video stack | module group (5 files) | `external/video/**` | Easy | Single | `video`, `twilio`, `webrtc`, `external` | Tracked, marked @deprecated 2026-10-16 |
| FE-01 safe-fetch legacy tuple API | types/functions (4) | `packages/safe-fetch/` | Moderate | Multiple | `safe-fetch`, `api`, `tuple`, `fetch`, `frontend` | Tracked |
| FE-02 Client `lib/socket.ts` monolith | module | `apps/client/src/lib/socket.ts` | Easy | Internal | `socket`, `realtime`, `client`, `frontend` | Tracked |
| FE-03 Client `lib/socket/` shims | barrel re-exports | `apps/client/src/lib/socket/` | Unknown | Unknown | `socket`, `shims`, `client`, `frontend` | Tracked |
| FE-05 `useLanguageStore` | store (+definition) | client app + `packages/store` | Moderate | Multiple | `language`, `i18n`, `store`, `zustand`, `next-intl`, `frontend` | Tracked |
| FE-06/07/10 Deprecated DTO fields | fields (`uid`, `avatar`, `is_available`) | `packages/store`, `packages/lib`, client `lib/types` | Unknown | Unknown | `dto`, `uid`, `avatar`, `is_available`, `types`, `frontend` | Tracked |
| FE-08 Client `refreshBalance` | store method | `apps/client/src/store/authStore.ts` | Moderate | Multiple | `authStore`, `balance`, `wallet`, `store`, `client`, `frontend` | Tracked |
| FE-09 Client `useExpertPresence` shim | hook re-export | `apps/client/src/hooks/` | Easy | Internal | `presence`, `hooks`, `shim`, `client`, `frontend` | Tracked |
| FE-11 Expert `utils/cn.tsx` shim | re-export | `apps/expert/src/utils/` | Easy | Internal | `cn`, `utils`, `shim`, `expert`, `frontend` | Tracked |

Resolved (not inventoried): legacy expert `src/lib/socket.ts` (already removed),
`ExpertGateway` (deleted 2026-10-01), `/expert/account/list` endpoint (replaced by `/experts`).

---

## BE-01 — Legacy chat module (31 backend files) [REMOVED 2026-10-17]

- **Status:** REMOVED on 2026-10-17. All 31 files deleted. Decoupled users, admin, expert, reviews modules to Drizzle `consultations.consultations`. Thin compatibility controller `ClientSessionCompatController` added to `ClientConsultationModule` for `/v1/chat/sessions/active-client`.
- **Tags:** `chat`, `realtime`, `consultation`, `typeorm`, `socket`
- **Type:** NestJS module group — gateway, module, service, 2 controllers
  (`chat.controller`, `consultation.controller`), 2 DTOs, 2 TypeORM
  entities, `enum.ts`, 21 use-cases.
- **Files:** `backend/src/internal/consultation/chat/chat.gateway.ts`,
  `chat.module.ts`, `chat.service.ts`, `controllers/chat.controller.ts`,
  `controllers/consultation.controller.ts` (never stubbed),
  `dto/consultation-book.dto.ts` (never stubbed),
  `dto/get-expert-chat-sessions.dto.ts`, `entities/chat-session.entity.ts`,
  `entities/chat-message.entity.ts`, `enum.ts` (never stubbed),
  `use-cases/{activate-session,
  admin-terminate-session, convert-to-paid, count-expert-sessions, end-chat,
  expire-session, find-active-client-session, find-all-sessions,
  find-client-sessions, find-expert-sessions, get-agent-total-commission,
  get-chat-earnings, get-chat-session-stats, get-expert-sessions-by-date,
  get-messages, get-session, get-total-sessions-count, reject-chat,
  resolve-session-details, save-message, update-session-metadata}.use-case.ts`
  (bodies restored 2026-10-08 via `git restore`; `@deprecated` markers added
  2026-10-14 — see marking note below).
- **Reason:** TypeORM chat stack on dead `chat` namespace (`room_*`,
  `expert_*` rooms). Replaced by `/realtime` (`SOCKET_EVENTS.CHAT`) +
  `actors/client/consultation/chat` (Drizzle). Per cerebrum 2026-10-06: delete
  only after request→accept→room→billing fully re-homed.
- **Replacement:** `src/internal/realtime/` + `src/internal/actors/client/consultation/chat/`.
- **Consumers (live evidence):**
  - DI: `consultation/consultation.module.ts` imports `ChatModule`
    (`forwardRef` + direct) and registers `ChatSession` via `TypeOrmModule`;
    `actors/client/consultation/chat/chat.module.ts` holds
    `forwardRef(() => ChatModule)` for the legacy `ChatService.expireSession`
    passthrough (still live).
  - TypeORM registrations: `consultation/reviews/reviews.module.ts`
    (`forFeature([Review, ChatSession, CallSession])`),
    `actors/admin/admin.module.ts` (`forFeature` incl. `ChatSession`).
  - Repository injection: `actors/admin/use-cases/get-admin-dashboard-stats.use-case.ts`
    (`@InjectRepository(ChatSession)` → `totalChatSessions`).
  - QueryBuilder use: `users/use-cases/get-filtered-users.use-case.ts`
    (`.from(ChatSession)`, `getRepository(ChatSession)`, `ChatSessionStatus`).
  - Runtime: client room page `chat/room/[id]` still calls legacy REST
    (`GET chat/user-session/:expert_id`, known 500 loop under investigation).
  - DB: live tables `consultations.chat_sessions`, `consultations.chat_messages`;
    `synchronize: false`, so removal needs an explicit drop migration.
- **Dependency level:** Critical/shared. **Difficulty:** Hard.
- **Removal notes:** Re-home billing/settlement + admin stats + filtered-users
  queries onto Drizzle tables first; drop dead REST routes used by client room
  page only after the new session-detail endpoint lands; ship drop-table
  migration. Do not stub-then-delete: the 2026-10-08 stub incident (52 files
  → comment-only) broke the build with 96 errors; restore-then-migrate only.
- **Deprecation marking (2026-10-14):** `@deprecated` JSDoc added to
  `ChatModule` (logs `Logger.warn` on init), `ChatGateway` (pre-existing note
  formalized), `ChatService`, `ChatController`, `consultation.controller.ts`
  (`v1/consultation`), and `enum.ts` (shared enums stay until importers
  migrate). Use-cases are covered by the module-level marking. No behavior
  change; frontends still served.
- **Capability inventory (reproduce on the new stack before removal):**
  lifecycle — activate, end (wallet debit/credit + commission splits),
  expire-pending, convert free→paid, admin terminate, reject; reads — session
  by id, history, client/expert sessions (pending/completed appointments),
  active-client session, all sessions (paginated+filter), session stats,
  sessions by date, resolve details, metadata update; money — expert
  revenue+count (single + all), earnings by date, agent commission; realtime —
  typing, 30s reconnect grace auto-end, 1h force-end; REST — `v1/chat/*`
  (activate, end, status patch, session, history, user-session, pending,
  completed, appointments pending/completed, all, my-sessions, active-client)
  + `v1/consultation/book-with-wallet`.

---

## BE-02 — Legacy call module (27 files) [REMOVED 2026-10-17]

- **Status:** REMOVED on 2026-10-17. All 27 files deleted. Decoupled expert earnings and reviews to Drizzle `consultations.consultations`. Thin compatibility controller `ExpertAppointmentsCompatController` added to `ExpertChatModule` for `/v1/chat/sessions/appointments/*` and `/v1/call/sessions/appointments/*`.
- **Tags:** `call`, `consultation`, `twilio`, `typeorm`, `webrtc`
- **Type:** NestJS module group — gateway, module, service, 2 controllers
  (`call.controller`, `twiml.controller`), 3 DTOs, 1 entity, `enum.ts`,
  `errors/call.errors.ts`, events, policy, `services/twilio.service.ts`,
  13 use-cases (`accept/end/initiate/reject/convert-to-paid/count/get-agent-
  total/get-call-earnings/get-call-session/get-call-token/get-expert-calls-
  by-date/get-expert-sessions/resolve-session-details`).
- **Files:** `backend/src/internal/consultation/call/**` (bodies restored
  2026-10-08; `enum.ts`, `errors/call.errors.ts`,
  `services/twilio.service.ts` were never stubbed).
- **Reason:** TypeORM call stack on dead `call` namespace. No actor-mirror yet;
  call re-homing is behind chat.
- **Replacement:** done — Drizzle `actors/client/consultation/voice`
  (`ClientVoiceModule`: `POST /v1/client/voice/initiate`, `GET
  /v1/client/voice/eligibility`, `GET /v1/client/voice/token/:consultationId`
  now Agora via `VoiceService`), `/realtime` call handlers
  (`ClientCallHandler`/`ExpertCallHandler` issuing Agora tokens scoped to
  `SOCKET_ROOMS.VOICE_SESSION` = `consultation:voice:<id>` on
  `consultation:call:join`, consumed by `@repo/rtc` `AgoraAdapter` on both
  apps), `external/voice` (`VoiceService`, Agora default). The only live
  Twilio remainder is the `VOICE_PROVIDER=twilio` fallback adapter
  (deprecated, see BE-13 pattern) — no runtime fallback logic.
- **Consumers:** DI via `consultation.module.ts` (`CallModule`, forwardRef +
  direct) and `TypeOrmModule.forFeature([CallSession])` there +
  `reviews.module.ts`; legacy expert call/video room pages + sockets.
- **Dependency level:** Multiple. **Difficulty:** Moderate.
- **Removal notes:** Needs its own actor-mirror epic first; then same playbook
  as BE-01 (stats, TypeOrm regs, drop migration for `consultations.call_*`).
- **Deprecation marking (2026-10-14):** `@deprecated` JSDoc added to
  `CallModule` (logs `Logger.warn` on init), `CallGateway`, `CallService`,
  `TwilioService`, `CallController` (`v1/call`), `TwimlController` (PSTN
  path — voice is WebRTC-only), and `enum.ts` (shared enums stay until
  importers migrate). Use-cases are covered by the module-level marking. No
  behavior change; frontends still served.
- **Capability inventory (reproduce on the new stack before removal):**
  lifecycle — initiate (eligibility, balance reserve, Twilio room), accept,
  end (wallet settlement + commission splits), convert-to-paid, reject; reads
  — session, Twilio access token, pending/completed appointments, all
  sessions, expert sessions + revenue, calls by date, resolve details; money
  — earnings by date + audio/video type, agent commission; realtime —
  `join_call_room`, paid-continuation confirm; REST — `v1/call/*` (initiate,
  accept, end, status patch, session, token, appointments pending/completed,
  all) + TwiML webhooks (droppable — WebRTC-only).

---

## BE-03 — Avatar URL columns (deprecated for `avatar_id` media FK)

- **Tags:** `avatar`, `media`, `user`, `account`, `profile`, `schema`, `typeorm`, `drizzle`
- **Type:** columns/fields (8): `avatar` in Drizzle schemas
  (`core/drizzledb/schema/{client/client-account, expert/expert-account,
  users/users}.schema.ts`), `avatar` in TypeORM entities
  (`actors/client/account/entities/account.entity.ts`,
  `actors/expert/account/entities/account.entity.ts`,
  `internal/users/entities/user.entity.ts`), `avatar` in
  (`actors/client/account/dto/account.dto.ts`, `internal/users/dto/user.dto.ts`).
- **Reason:** legacy URL strings; canonical is `avatar_id` → Media + `avatar_media` relation.
- **Replacement:** `avatar_id` / `avatar_media` (both ORMs already carry them).
- **Consumers:** columns still populated for back-compat; readers across client/expert apps (`avatar` fallbacks). **Level:** Multiple. **Difficulty:** Moderate.
- **Removal notes:** verify zero readers, ship drop-column migration (both ORM layers + Drizzle schema).

---

## BE-04 — Expert generic upload endpoints

- **Tags:** `expert`, `upload`, `media`, `cloudinary`, `controller`
- **Type:** routes: `POST upload`, `POST upload-document` in
  `actors/expert/account/controllers/account.controller.ts`
  (marked `@deprecated`, logs `Logger.warn`; generic upload never attaches
  media to the account).
- **Replacement:** `PATCH /expert/account/avatar` (+`picture` alias),
  `PATCH /expert/account/intro-video`.
- **Consumers:** Internal (expert app upload flows — verify none call generic). **Difficulty:** Moderate.
- **Removal notes:** confirm no expert-app callers, then delete routes.

---

## BE-05 — Expert legacy `video` column

- **Tags:** `expert`, `video`, `media`, `account`, `schema`
- **Type:** column `video` in expert `account.entity.ts` (`@deprecated`, use
  `intro_video_id` + `intro_video_media`).
- **Consumers/notes:** same playbook as BE-03. **Difficulty:** Moderate.

---

## BE-06 — CloudinaryService facade

- **Tags:** `cloudinary`, `storage`, `media`, `service`, `external`
- **Type:** service `external/cloudinary/cloudinary.service.ts` (`@deprecated`:
  use ImageUploadService / VideoUploadService / Base64UploadService).
- **Consumers:** none outside its own dir. **Difficulty:** Easy.
- **Removal notes:** delete class + module wiring once confirmed unregistered.

---

## BE-07 — `validateWebhookSignature` (optional interface method)

- **Tags:** `payment`, `razorpay`, `webhook`, `gateway`, `signature`
- **Type:** method on `external/payment/payment-gateway.interface.ts`
  (`@deprecated`, use `verifyWebhookSignature(request)`).
- **Consumers:** `payment-webhook.guard.ts` already uses `verifyWebhookSignature`;
  `razorpay.provider.ts` implements both (optional one delegates).
  **Difficulty:** Easy.
- **Removal notes:** delete optional member + provider passthrough.

---

## BE-08 — Expert `is_available` flag

- **Tags:** `expert`, `availability`, `presence`, `account`, `schema`
- **Type:** column, documented-as-deprecated (cerebrum, architecture-backend,
  domain docs; kept alongside canonical `availability_mode`).
- **Replacement:** `availability_mode` (`available|unavailable`).
- **Consumers:** presence derivation + availability toggles still reference it.
  **Difficulty:** Moderate. **Removal notes:** migrate readers, drop column.

---

## BE-09 — Commerce Wishlist Module (`WishlistModule.ts`)

- **Tags:** `wishlist`, `commerce`, `favorites`, `like`, `typeorm`, `module`
- **Type:** NestJS module group (14 files) — `wishlist.module.ts`, `wishlist.service.ts`, 4 controllers (`product-like`, `expert-like`, `puja-like`, `merchant-like`), 1 entity (`wishlist.entity.ts`), 12 use-cases.
- **File:** `backend/src/internal/commerce/wishlist/wishlist.module.ts` (marked `@deprecated` 2026-10-09).
- **Reason:** Legacy TypeORM wishlist stack. Replaced by `src/internal/actors/client/favorites/` (`FavoritesModule`) using Drizzle ORM (`commerce.wishlists`).
- **Replacement:** `src/internal/actors/client/favorites/` (`FavoritesModule` with 9 Drizzle use-cases for expert/product/product_variant).
- **Consumers:**
  - Standalone module: Not imported in `app.module.ts` or `commerce.module.ts`.
  - TypeORM relations: `Wishlist` entity registered via `TypeOrmModule.forFeature([Wishlist, Product, User])`.
  - Injected sub-modules: imports `AccountModule`, `MerchantAccountModule`, `ExpertProfileModule`, `UsersModule`, `ExpertModule`.
- **Dependency level:** Multiple (internal). **Difficulty:** Moderate.
- **Removal notes:** Verify all client/mobile frontend endpoints call `/client/favorites/*` instead of legacy `/wishlist/*` / `*-like` controllers, then remove `internal/commerce/wishlist/` directory.

---

## BE-10 — Expert Profile Module (`ExpertProfileModule` / `profile.module.ts`)

- **Tags:** `expert`, `profile`, `discovery`, `account`, `puja`, `kyc`, `typeorm`, `module`
- **Type:** NestJS module group (22 files) — `profile.module.ts`, `profile.service.ts`, `controllers/profile.controller.ts`, 2 entities (`profile-expert.entity.ts`, `expert-puja.entity.ts`), 16 use-cases, 2 event-handlers.
- **File:** `backend/src/internal/actors/expert/profile/profile.module.ts` (marked `@deprecated` 2026-10-09).
- **Reason:** Legacy TypeORM expert profile and marketplace discovery stack. Replaced by Drizzle `ExpertAccountModule` (`src/internal/actors/expert/account/`) and `ExpertDiscoveryModule` (`src/internal/actors/expert/discovery/`).
- **Replacement:** `src/internal/actors/expert/account/` (`ExpertAccountModule`) + `src/internal/actors/expert/discovery/` (`ExpertDiscoveryModule`).
- **Consumers:**
  - DI Imports: `finance/wallet/wallet.module.ts`, `commerce/wishlist/wishlist.module.ts`, `consultation/call/call.module.ts`, `consultation/reviews/reviews.module.ts`, `consultation/chat/chat.module.ts`, `auth/auth.module.ts`, `actors/admin/admin.module.ts`, `actors/agent/agent.module.ts`, `puja-appointment/puja-appointment.module.ts`.
  - Service consumers (`ExpertProfileService`): `admin/use-cases/get-expert-detail`, `admin/use-cases/update-expert-status`, `agent/use-cases/get-admin-listings`, `puja-appointment/use-cases/create-puja-appointment`, `consultation/reviews`, `consultation/call`.
- **Dependency level:** Critical/shared. **Difficulty:** Moderate.
- **Removal notes:** Migrate remaining consumer use-cases (`admin`, `agent`, `puja-appointment`, `consultation/reviews`) to inject `ExpertAccountService` / `ExpertDiscoveryService` or Drizzle `expertAccounts` table, then remove `internal/actors/expert/profile/`.

---

## BE-11 — Commissions Module (`CommissionsModule.ts`)

- **Tags:** `commissions`, `finance`, `split`, `rule`, `tier`, `typeorm`, `module`
- **Type:** NestJS module group (17 files) — `commissions.module.ts`, `commissions.service.ts`, 2 controllers (`commission-rules`, `commission-splits`), 3 entities (`commission-rule`, `commission-split`, `commission-tier`), 4 DTOs, 6 use-cases.
- **File:** `backend/src/internal/finance/commissions/commissions.module.ts` (marked `@deprecated` 2026-10-09).
- **Reason:** Legacy TypeORM commission rules and splits stack. Slated for phased deprecation/removal per project instruction.
- **Replacement:** None (or Drizzle finance schema `core/drizzledb/schema/finance/commissions/` if resurrected).
- **Consumers:**
  - DI Imports: `finance/wallet/wallet.module.ts`, `actors/admin/admin.module.ts`, `actors/agent/agent.module.ts`, `actors/merchant/dashboard/merchant-dashboard.module.ts`.
  - Service consumers (`CommissionsService`): `agent/use-cases/get-agent-stats`, `agent/use-cases/settle-agent-commissions`, `merchant/dashboard/use-cases/calculate-merchant-earnings`.
- **Dependency level:** Multiple. **Difficulty:** Moderate.
- **Removal notes:** Decouple `agent` and `merchant` stats/earnings calculation from `CommissionsService`, drop `CommissionsModule` import from `wallet.module.ts`, `admin.module.ts`, `agent.module.ts`, and `merchant-dashboard.module.ts`, then remove `internal/finance/commissions/`.

---

## BE-12 — BankAccountsModule (`bank-accounts.module.ts`)

- **Tags:** `expert`, `bank-account`, `payout`, `typeorm`, `module`
- **Type:** NestJS module group (16 files) — `bank-accounts.module.ts`, `bank-accounts.service.ts`, `controllers/bank-accounts.controller.ts`, 1 entity (`bank-account.entity.ts`), 2 error classes, 1 event handler, events, policy, 1 DTO, 6 use-cases (`create`, `get`, `list`, `remove`, `set-primary`, `update`).
- **File:** `backend/src/internal/actors/expert/bank-accounts/bank-accounts.module.ts` (marked `@deprecated` 2026-10-12).
- **Reason:** Legacy TypeORM expert bank accounts and payout destination stack. Slated for replacement by Drizzle persistence or account-embedded payout details.
- **Replacement:** None yet (future Drizzle `expert.bank_accounts` or direct payout integration).
- **Consumers:**
  - DI Imports: `finance/wallet/wallet.module.ts`, `actors/expert/expert.module.ts`.
  - TypeORM registrations: `TypeOrmModule.forFeature([BankAccount, ExpertAccount])`.
  - Frontend callers: `apps/expert` (`/expert/bank-accounts` endpoints in `profile.ts` and `useWallet.ts`).
- **Dependency level:** Multiple (internal). **Difficulty:** Moderate.
- **Removal notes:** Migrate/re-home expert frontend payout endpoints (`/expert/bank-accounts`), decouple `WalletModule` and `ExpertModule` imports, then remove `internal/actors/expert/bank-accounts/`.

---

## BE-13 — Twilio video stack (`external/video`)

- **Tags:** `video`, `twilio`, `webrtc`, `external`
- **Type:** NestJS module group (5 files) — `video.module.ts`, `video.service.ts`,
  `video.types.ts`, `adapters/twilio-video.adapter.ts`, `errors/video.errors.ts`.
- **Files:** `backend/src/external/video/**` (marked `@deprecated` 2026-10-16:
  module logs `Logger.warn` on init, service + adapter carry JSDoc markers).
- **Reason:** Single-provider Twilio video stack. Voice moved to `external/voice`
  (`VoiceService`, Agora default via `VOICE_PROVIDER`); video follows the same
  provider pattern when rebuilt. `ClientVoiceModule` no longer imports it
  (`GetVoiceTokenUsecase` mints Agora via `VoiceService`, channel
  `consultation:voice:<id>`, identity `client_<id>_consult_<cid>`).
- **Replacement:** `src/external/voice/` (`VoiceService` + `AgoraVoiceAdapter`).
- **Consumers:** `ExternalModule` still registers `VideoModule` (global) — removal
  means dropping it from `imports`/`exports` there. No feature module imports it
  anymore. Test-only: `video.spec.ts`.
- **Dependency level:** Single. **Difficulty:** Easy.
- **Removal notes:** confirm no runtime callers, remove `VideoModule` from
  `ExternalModule`, delete `external/video/`. Note: `resolveVideoOptions`
  throws at boot without Twilio env — removing the registration also removes
  that boot landmine for Agora-only deployments.

---

## FE-01 — safe-fetch legacy tuple API

- **Tags:** `safe-fetch`, `api`, `tuple`, `fetch`, `frontend`
- **Type:** `LegacyResult`, `SafeFetchInstance`, `createSafeFetchInstance`,
  default `safeFetch` in `frontend/packages/safe-fetch/` (all `@deprecated`;
  new code uses `createSafeFetchResultInstance` / `Result<T>`).
- **Consumers:** `apps/expert/src/lib/api.ts`, `apps/commerce/src/lib/api/`,
  `apps/admin/src/lib/api.ts`, `apps/admin/src/actions/auth.ts`,
  `apps/client/src/actions/index.ts` (instance creation),
  `apps/agent/src/lib/api.ts`, `packages/ui/src/utils/api.ts`. **Level:** Multiple. **Difficulty:** Moderate.
- **Removal notes:** migrate 7 files to `Result<T>` pattern first.

---

## FE-02 — Client `lib/socket.ts` monolith

- **Tags:** `socket`, `realtime`, `client`, `frontend`
- **Type:** module (`@deprecated`, use `@/lib/socket/*` + `@/realtime/*`).
- **Consumers:** `apps/client/src/providers/MerchantStatusProvider.tsx` (1).
  **Difficulty:** Easy.

---

## FE-03 — Client `lib/socket/` shims

- **Tags:** `socket`, `shims`, `client`, `frontend`
- **Type:** barrel re-exports (`index.ts`, `types.ts` → `@/realtime/*`).
- **Consumers/level:** Unknown (barrel importers not enumerated).
  **Difficulty:** Unknown. **Notes:** enumerate `@/lib/socket` importers first.

---

## FE-05 — `useLanguageStore`

- **Tags:** `language`, `i18n`, `store`, `zustand`, `next-intl`, `frontend`
- **Type:** Zustand store (`packages/store/src/languageStore.ts`), phased out for `next-intl`.
- **Consumers:** 10 client files (calculators, horoscope, live-darshan pages).
  **Level:** Multiple. **Difficulty:** Moderate (mechanical migration).

---

## FE-06/07/10 — Deprecated DTO fields (`uid`→`public_id`, `avatar`→`avatar_media`, `is_available`)

- **Tags:** `dto`, `uid`, `avatar`, `is_available`, `types`, `frontend`
- **Type:** optional fields in `packages/store/src/authStore.ts`,
  `packages/lib/src/types/{expert,client}.ts`, client `lib/types/{user,client}.ts`.
- **Consumers/level:** Unknown (field readers not enumerated). **Difficulty:** Unknown.

---

## FE-08 — Client `refreshBalance` store method

- **Tags:** `authStore`, `balance`, `wallet`, `store`, `client`, `frontend`
- **Type:** method on `apps/client/src/store/authStore.ts` (`@deprecated`).
- **Consumers:** 9 files (chat-prep hook/modal, checkout, call/chat prep pages,
  profile hooks). **Level:** Multiple. **Difficulty:** Moderate (migrate to `updateBalance`/balance selectors).

---

## FE-09 — Client `useExpertPresence` shim

- **Tags:** `presence`, `hooks`, `shim`, `client`, `frontend`
- **Type:** hook re-export (`hooks/useExpertPresence.ts` → `@/realtime/hooks/use-presence`).
- **Consumers:** 6 files (mechanical import-path swap). **Difficulty:** Easy.

---

## FE-11 — Expert `utils/cn.tsx` shim

- **Tags:** `cn`, `utils`, `shim`, `expert`, `frontend`
- **Type:** re-export (`@/lib/cn` canonical). **Consumers:** 1 (`lib/cn.ts`).
  **Difficulty:** Easy.

---

## Removal groups

### Safe to remove (no/trivial consumers)
BE-06, BE-07, BE-13, FE-02, FE-09, FE-11.

### Requires consumer migration
BE-02, BE-04, BE-05, BE-08, BE-09, BE-10, BE-11, FE-01, FE-05, FE-08 (+ FE-03/FE-06/07/10 once enumerated).

### Requires architectural work
BE-01 (billing re-home + admin stats + filtered-users + client room page + drop-table migration), BE-03 (dual-ORM column drop + backfill verification).

### Key migration risks
1. **Never stub-then-delete:** Oct 2026 incident reducing 52 files to comment-only stubs broke `pnpm build` (96 errors); always restore-then-migrate.
2. `ClientChatModule forwardRef(() => ChatModule)` keeps legacy `ChatService.expireSession` on the live path.
3. `synchronize: false` — dropping entities without explicit migrations silently diverges prod.
4. Client room page still calls legacy `GET chat/user-session/:expert_id` (active 500 loop); do not remove routes before the replacement session-detail endpoint ships.

