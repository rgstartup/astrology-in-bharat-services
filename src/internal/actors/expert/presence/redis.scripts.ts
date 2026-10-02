import type { Redis } from 'ioredis';
import type { PresenceRedisClient } from './presence.types';

// Batch realtime presence Lua script
export const BATCH_REALTIME_PRESENCE_LUA = `
local results = {}
for i = 1, #KEYS do
  local connSetKey = KEYS[i]
  local currentConns = redis.call('SMEMBERS', connSetKey)
  local activeCount = 0
  for j, c in ipairs(currentConns) do
    local cKey = 'presence:connection:' .. c
    if redis.call('EXISTS', cKey) == 1 then
      activeCount = activeCount + 1
    else
      redis.call('SREM', connSetKey, c)
    end
  end
  if activeCount == 0 then
    redis.call('DEL', connSetKey)
  end
  table.insert(results, activeCount)
end
return results`;

// Disconnect connection Lua script
export const DISCONNECT_LUA = `
local connSetKey = KEYS[1]
local connKey = KEYS[2]
local connId = ARGV[2]

redis.call('SREM', connSetKey, connId)
redis.call('DEL', connKey)

local currentConns = redis.call('SMEMBERS', connSetKey)
local remainingCount = 0
for i, c in ipairs(currentConns) do
  local cKey = 'presence:connection:' .. c
  if redis.call('EXISTS', cKey) == 1 then
    remainingCount = remainingCount + 1
  else
    redis.call('SREM', connSetKey, c)
  end
end

if remainingCount == 0 then
  redis.call('DEL', connSetKey)
end

return remainingCount`;

// Get realtime presence Lua script
export const GET_REALTIME_PRESENCE_LUA = `
local connSetKey = KEYS[1]
local currentConns = redis.call('SMEMBERS', connSetKey)
local activeCount = 0
for i, c in ipairs(currentConns) do
  local cKey = 'presence:connection:' .. c
  if redis.call('EXISTS', cKey) == 1 then
    activeCount = activeCount + 1
  else
    redis.call('SREM', connSetKey, c)
  end
end
if activeCount == 0 then
  redis.call('DEL', connSetKey)
  return 0
end
return activeCount`;

// Heartbeat connection Lua script
export const HEARTBEAT_LUA = `
local connSetKey = KEYS[1]
local connKey = KEYS[2]
local expertId = ARGV[1]
local connId = ARGV[2]
local ttl = tonumber(ARGV[3])
local now = ARGV[4]

local exists = redis.call('EXISTS', connKey)
redis.call('SET', connKey, cjson.encode({ expertId = expertId, connectionId = connId, lastSeen = now }), 'EX', ttl)
redis.call('SADD', connSetKey, connId)
redis.call('EXPIRE', connSetKey, ttl * 2)

return (exists == 1) and 1 or 2`;

// Register connection Lua script
export const REGISTER_CONNECTION_LUA = `
local connSetKey = KEYS[1]
local connKey = KEYS[2]
local expertId = ARGV[1]
local connId = ARGV[2]
local ttl = tonumber(ARGV[3])
local now = ARGV[4]

local currentConns = redis.call('SMEMBERS', connSetKey)
local activeCount = 0
for i, c in ipairs(currentConns) do
  local cKey = 'presence:connection:' .. c
  if redis.call('EXISTS', cKey) == 1 then
    activeCount = activeCount + 1
  else
    redis.call('SREM', connSetKey, c)
  end
end

local wasOnline = (activeCount > 0) and 1 or 0
redis.call('SET', connKey, cjson.encode({ expertId = expertId, connectionId = connId, lastSeen = now }), 'EX', ttl)
redis.call('SADD', connSetKey, connId)
redis.call('EXPIRE', connSetKey, ttl * 2)

return { wasOnline, activeCount + 1 }`;
