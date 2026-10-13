export const SOCKET_EVENTS = {
  PRESENCE: {
    HEARTBEAT: 'presence:heartbeat',
    SUBSCRIBE: 'presence:subscribe',
    UNSUBSCRIBE: 'presence:unsubscribe',
    SUBSCRIBE_MANY: 'presence:subscribe_many',
    UNSUBSCRIBE_MANY: 'presence:unsubscribe_many',
    UPDATED: 'presence:updated',
  },

  NOTIFICATION: {
    SUBSCRIBE: 'notification:subscribe',
    UNSUBSCRIBE: 'notification:unsubscribe',
    READ: 'notification:read',
    NEW: 'notification:new',
  },

  CHAT: {
    // Transport-only events (remain on chat gateway)
    JOIN: 'consultation:chat:join',
    LEAVE: 'consultation:chat:leave',
    SEND: 'consultation:chat:send',
    MESSAGE: 'consultation:chat:message',
    TYPING: 'consultation:chat:typing',

    // Deprecated lifecycle events — use CONSULTATION.COMMANDS/EVENTS instead
    // END: 'consultation:chat:end',
    // REQUEST: 'consultation:chat:request',
    // INCOMING: 'consultation:chat:incoming',
    // ACCEPT: 'consultation:chat:accept',
    // REJECT: 'consultation:chat:reject',
    // ACCEPTED: 'consultation:chat:accepted',
    // REJECTED: 'consultation:chat:rejected',
    // CANCEL: 'consultation:chat:cancel',
    // ENDED: 'consultation:chat:ended',
    // PAUSE: 'consultation:chat:pause',
    // PAUSED: 'consultation:chat:paused',
    // RESUME: 'consultation:chat:resume',
    // RESUMED: 'consultation:chat:resumed',
  },

  /**
   * Root Consultation Orchestrator Contract across chat, voice, and video.
   * Divided into COMMANDS (inbound actions), EVENTS (outbound state broadcasts),
   * and BUDGET (wallet metering and grace period notifications).
   */
  CONSULTATION: {
    // 1. Inbound Commands (Client / Expert -> Server)
    COMMANDS: {
      REQUEST: 'consultation:request',
      ACCEPT: 'consultation:accept',
      REJECT: 'consultation:reject',
      CANCEL: 'consultation:cancel',
      START: 'consultation:start',
      PAUSE: 'consultation:pause',
      RESUME: 'consultation:resume',
      DISCONNECT: 'consultation:disconnect',
      END: 'consultation:end',
      GET_STATUS: 'consultation:get_status',
    },

    // 2. Outbound State Events (Server -> Room / Participants)
    EVENTS: {
      STATE: 'consultation:state',
      INCOMING: 'consultation:incoming',
      ACCEPTED: 'consultation:accepted',
      REJECTED: 'consultation:rejected',
      CANCELLED: 'consultation:cancelled',
      STARTED: 'consultation:started',
      PAUSED: 'consultation:paused',
      RESUMED: 'consultation:resumed',
      DISCONNECTED: 'consultation:disconnected',
      ENDED: 'consultation:ended',
    },

    // 3. Outbound Budget & Metering Events (Server -> Room / Participants)
    BUDGET: {
      TICK: 'consultation:budget:tick',
      WARNING: 'consultation:budget:warning',
      EXHAUSTED: 'consultation:budget:exhausted',
      RESTORED: 'consultation:budget:restored',
    },

    // Backwards-compatible legacy aliases
    PAUSE: 'consultation:pause',
    PAUSED: 'consultation:paused',
    RESUME: 'consultation:resume',
    RESUMED: 'consultation:resumed',
  },

  CALL: {
    JOIN: 'consultation:call:join',
    OFFER: 'consultation:call:offer',
    ANSWER: 'consultation:call:answer',
    ICE_CANDIDATE: 'consultation:call:ice_candidate',
    ACCEPT: 'consultation:call:accept',
    REJECT: 'consultation:call:reject',
    END: 'consultation:call:end',
    INCOMING: 'consultation:call:incoming',
  },
} as const;

export type SocketEventGroup = keyof typeof SOCKET_EVENTS;
