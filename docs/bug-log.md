# Bug Log

## 2026-10-04 — Backend container `ETIMEDOUT`/`ECONNRESET` to NeonDB

- **Symptom:** `docker compose --profile dev up` → `[TypeOrmModule] Unable to connect to the database`, `AggregateError [ETIMEDOUT]` (IPv4) + `ENETUNREACH` (IPv6). Occasionally surfaced as `ECONNRESET`. Same `DATABASE_URL` worked outside docker.
- **Ruled out:** TLS config (`DATABASE_URL` already carries `sslmode=require`), firewall/Nav, DNS, Neon allowlist — raw TCP from inside the container's own netns connected in ~300–500 ms.
- **Cause:** Neon hostname resolves to 6 addresses (3× IPv4 + 3× IPv6). Container has no IPv6 route, and Node's Happy Eyeballs aborts each connection attempt after 250 ms (`autoSelectFamilyAttemptTimeout` default) — just before the ~300–500 ms SYN-ACK arrives. Every attempt died; pool exhausted retries.
- **Fix:** `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=2000` on both backend services in `compose.yml`. Verified: `Nest application successfully started`, zero connection errors.
