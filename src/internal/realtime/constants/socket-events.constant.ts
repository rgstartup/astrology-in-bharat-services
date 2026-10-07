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
    JOIN: 'chat:join',
    LEAVE: 'chat:leave',
    SEND: 'chat:send',
    MESSAGE: 'chat:message',
    TYPING: 'chat:typing',
    END: 'chat:end',
    REQUEST: 'chat:request',
    INCOMING: 'chat:incoming',
    ACCEPT: 'chat:accept',
    REJECT: 'chat:reject',
    ACCEPTED: 'chat:accepted',
    REJECTED: 'chat:rejected',
  },

  CALL: {
    JOIN: 'call:join',
    OFFER: 'call:offer',
    ANSWER: 'call:answer',
    ICE_CANDIDATE: 'call:ice_candidate',
    ACCEPT: 'call:accept',
    REJECT: 'call:reject',
    END: 'call:end',
    INCOMING: 'call:incoming',
  },
} as const;

export type SocketEventGroup = keyof typeof SOCKET_EVENTS;
