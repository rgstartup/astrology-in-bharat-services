export const SOCKET_EVENTS = {
  PRESENCE: {
    HEARTBEAT: "presence:heartbeat",
    SUBSCRIBE: "presence:subscribe",
    UNSUBSCRIBE: "presence:unsubscribe",
    SUBSCRIBE_MANY: "presence:subscribe_many",
    UNSUBSCRIBE_MANY: "presence:unsubscribe_many",
    UPDATED: "presence:updated",
  },

  NOTIFICATION: {
    SUBSCRIBE: "notification:subscribe",
    UNSUBSCRIBE: "notification:unsubscribe",
    READ: "notification:read",
    NEW: "notification:new",
  },

  CHAT: {
    SEND: "consultation:chat:send",
    MESSAGE: "consultation:chat:message",
    TYPING: "consultation:chat:typing",
  },

  /**
   * Root Consultation Orchestrator Contract across chat, voice, and video.
   * Divided into COMMANDS (inbound actions), EVENTS (outbound state broadcasts),
   * and BUDGET (wallet metering and grace period notifications).
   */
  CONSULTATION: {
    // 1. Inbound Commands (Client / Expert -> Server)
    COMMANDS: {
      REQUEST: "consultation:request",
      ACCEPT: "consultation:accept",
      REJECT: "consultation:reject",
      CANCEL: "consultation:cancel",
      START: "consultation:start",
      JOIN: "consultation:join",
      LEAVE: "consultation:leave",
      MEDIA_READY: "consultation:media_ready",
      VOICE_TOKEN: "consultation:voice_token",
      PAUSE: "consultation:pause",
      RESUME: "consultation:resume",
      RESUME_CHAT: "consultation:resume:chat",
      RESUME_VOICE: "consultation:resume:voice",
      RESUME_VIDEO: "consultation:resume:video",
      DISCONNECT: "consultation:disconnect",
      END: "consultation:end",
      GET_STATUS: "consultation:get_status",
      SWITCH_TO_CHAT: "consultation:switch_to_chat",
      CLOSE: "consultation:close",
    },

    // 2. Outbound State Events (Server -> Room / Participants)
    EVENTS: {
      STATE: "consultation:state",
      INCOMING: "consultation:incoming",
      ACCEPTED: "consultation:accepted",
      REJECTED: "consultation:rejected",
      CANCELLED: "consultation:cancelled",
      STARTED: "consultation:started",
      MEDIA_READY: "consultation:media_ready",
      PAUSED: "consultation:paused",
      RESUMED: "consultation:resumed",
      RESUMED_CHAT: "consultation:resumed:chat",
      RESUMED_VOICE: "consultation:resumed:voice",
      RESUMED_VIDEO: "consultation:resumed:video",
      DISCONNECTED: "consultation:disconnected",
      ENDED: "consultation:ended",
    },

    // 3. Outbound Budget & Metering Events (Server -> Room / Participants)
    BUDGET: {
      TICK: "consultation:budget:tick",
      WARNING: "consultation:budget:warning",
      EXHAUSTED: "consultation:budget:exhausted",
      RESTORED: "consultation:budget:restored",
    },

    // Backwards-compatible legacy aliases
    PAUSE: "consultation:pause",
    PAUSED: "consultation:paused",
    RESUME: "consultation:resume",
    RESUMED: "consultation:resumed",
  },

  /**
   * Media signalling shared by voice and video (WebRTC offer/answer/ICE).
   * Transport-only relay — lifecycle rides on CONSULTATION commands/events.
   */
  MEDIA: {
    OFFER: "consultation:media:offer",
    ANSWER: "consultation:media:answer",
    ICE_CANDIDATE: "consultation:media:ice_candidate",
  },
} as const;

export type SocketEventGroup = keyof typeof SOCKET_EVENTS;
