import Redis from 'ioredis';
import { PresenceRedisClient } from '../presence.types';
import {
  BATCH_REALTIME_PRESENCE_LUA,
  DISCONNECT_LUA,
  GET_REALTIME_PRESENCE_LUA,
  HEARTBEAT_LUA,
  REGISTER_CONNECTION_LUA,
} from '../redis.scripts';

/**
 * Registers presence Lua scripts on the client via `defineCommand`
 * (EVALSHA with EVAL fallback) and returns a typed client.
 * The single `as` here is the only cast: `Redis` -> `Redis & X`
 * is a narrowing to an intersection, no `unknown` involved.
 */
export function registerPresenceScripts(client: Redis): PresenceRedisClient {
  client.defineCommand('presenceRegisterConnection', {
    numberOfKeys: 2,
    lua: REGISTER_CONNECTION_LUA,
  });
  client.defineCommand('presenceHeartbeat', {
    numberOfKeys: 2,
    lua: HEARTBEAT_LUA,
  });
  client.defineCommand('presenceDisconnect', {
    numberOfKeys: 2,
    lua: DISCONNECT_LUA,
  });
  client.defineCommand('presenceGetRealtime', {
    numberOfKeys: 1,
    readOnly: true,
    lua: GET_REALTIME_PRESENCE_LUA,
  });
  // Dynamic key count: caller passes numKeys as first arg.
  client.defineCommand('presenceBatchRealtime', {
    readOnly: true,
    lua: BATCH_REALTIME_PRESENCE_LUA,
  });
  return client as PresenceRedisClient;
}
