import { Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { chatRequestTtlMs } from '@/internal/consultation/room/consultation-room.repository';
import { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';

/**
 * Per-request expiry timers. Armed on `chat:request`, cancelled on
 * `chat:accept`/`chat:reject`, auto-fires the rejection verdict when
 * the window lapses. Process-local by nature — the cron sweep is the safety
 * net for other instances and restarts.
 */
const logger = new Logger('ChatRequestTimer');
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const chatRequestTimers = {
  /** Arm (or re-arm) the expiry timer for a consultation. */
  arm(
    orchestrator: ConsultationOrchestratorService,
    server: Server,
    consultationId: number,
  ): void {
    this.cancel(consultationId);
    timers.set(
      consultationId,
      setTimeout(() => {
        timers.delete(consultationId);
        orchestrator
          .reject(server, {
            consultationId,
            actorId: 0,
            actorType: 'system',
            reason: 'request_timeout',
          })
          .catch((err: Error) =>
            logger.error(
              `[ChatTimer] Expiry failed for ${consultationId}: ${err.message}`,
            ),
          );
      }, chatRequestTtlMs()),
    );
  },

  /** Cancel the timer — accept/reject verdicts own the row from here. */
  cancel(consultationId: number): void {
    const pending = timers.get(consultationId);
    if (pending) {
      clearTimeout(pending);
      timers.delete(consultationId);
    }
  },
};
