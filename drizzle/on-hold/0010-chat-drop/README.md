# 0010 chat-drop — PARKED, do not apply yet

Drops `consultations.chat_sessions` / `chat_messages` (CASCADE) and repoints
`reviews.session_id` at `consultation_sessions`. Generated 2026-10-06 after the
Drizzle `chat/` schema mirror was deleted.

Why parked: the legacy TypeORM chat runtime (gateway, history, dashboard,
raw-SQL stats) still reads these tables, and `support.support_disputes`
holds an FK to `chat_sessions` that the CASCADE drop removes silently.

To restore when the legacy runtime has migrated:
1. `cp 0010_fine_logan.sql 0010_snapshot.json ../../migrations/` (sql -> migrations/, snapshot -> migrations/meta/)
2. Re-add to `migrations/meta/_journal.json`:
   `{"idx": 10, "version": "7", "when": 1791267324381, "tag": "0010_fine_logan", "breakpoints": true}`
3. Re-point `support.support_disputes.consultation_id` first (it references
   `chat_sessions.id`), then run `npm run db:migrate`.

Note: line 5 of the SQL was fixed vs the generated version — the reviews FK
on real databases uses the TypeORM name `FK_ecbc75cbb93e18a8835aae78204`,
not the Drizzle name. Both are dropped IF EXISTS.
