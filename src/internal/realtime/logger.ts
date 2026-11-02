import { appendFileSync } from "fs";
import { join } from "path";

const LOG_FILE = join(
  process.cwd(),
  "logs/realtime-gateway.log",
);

/**
 * Append a timestamped line to logs/realtime-gateway.log.
 * Best-effort: never throws, so a filesystem issue can never break the
 * socket / gateway path.
 */
export function appendRealtimeLog(message: string): void {
  const line = `${new Date().toISOString()} | ${message}\n`;
  try {
    appendFileSync(LOG_FILE, line);
  } catch {
    /* swallow: realtime file logging is best-effort only */
  }
}
