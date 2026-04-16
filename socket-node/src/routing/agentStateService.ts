import { redisClient } from "../lib/redisClient.js";

// ─── Key helpers ──────────────────────────────────────────────────────────────

const keys = {
  agentState: (tid: string, uid: string) => `agent:${tid}:${uid}:state`,
  agentActiveChats: (tid: string, uid: string) => `agent:${tid}:${uid}:active_chats`,
  agentSkills: (tid: string, uid: string) => `agent:${tid}:${uid}:skills`,
  onlineAgents: (tid: string) => `tenant:${tid}:agents:online`,
};

// ─── Lua: atomic capacity-check + increment ───────────────────────────────────
//
// Reads active_chats and maxCapacity in one round-trip. If under capacity,
// increments and returns 1. Otherwise returns 0. No TOCTOU window.
const LUA_TRY_ASSIGN = `
local current = tonumber(redis.call('GET', KEYS[1])) or 0
local maxCap  = tonumber(redis.call('HGET', KEYS[2], 'maxCapacity')) or 5
if current < maxCap then
  redis.call('INCR', KEYS[1])
  return 1
end
return 0
`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PresenceStatus = "online" | "away" | "offline";

export interface AgentState {
  presence: PresenceStatus;
  maxCapacity: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Syncs an agent's full profile into Redis.
 * Called when the agent emits agent:setPresence with their profile payload.
 * A pipeline is used so all writes land in a single round-trip.
 */
export async function syncAgentState(
  tenantId: string,
  userId: string,
  skillIds: string[],
  maxCapacity: number,
  presence: PresenceStatus
): Promise<void> {
  const stateKey = keys.agentState(tenantId, userId);
  const skillsKey = keys.agentSkills(tenantId, userId);
  const onlineKey = keys.onlineAgents(tenantId);
  const activeChatKey = keys.agentActiveChats(tenantId, userId);

  const pipeline = redisClient.pipeline();

  // Store scalar state in a hash
  pipeline.hset(stateKey, { presence, maxCapacity: String(maxCapacity) });

  // Replace skill set atomically
  pipeline.del(skillsKey);
  if (skillIds.length > 0) {
    pipeline.sadd(skillsKey, ...skillIds);
  }

  // Initialise active_chats counter only if it doesn't already exist
  // (SETNX) so reconnects don't reset an in-progress count
  pipeline.setnx(activeChatKey, "0");

  // Maintain the online-agents set
  if (presence === "online") {
    pipeline.sadd(onlineKey, userId);
  } else {
    pipeline.srem(onlineKey, userId);
  }

  await pipeline.exec();
}

/**
 * Update only the presence field and the online-agents set.
 * Used when an agent changes status mid-session without re-sending skills.
 */
export async function setPresence(
  tenantId: string,
  userId: string,
  presence: PresenceStatus
): Promise<void> {
  const pipeline = redisClient.pipeline();
  pipeline.hset(keys.agentState(tenantId, userId), "presence", presence);

  if (presence === "online") {
    pipeline.sadd(keys.onlineAgents(tenantId), userId);
  } else {
    pipeline.srem(keys.onlineAgents(tenantId), userId);
  }

  await pipeline.exec();
}

/**
 * Remove the agent from all runtime state when they disconnect.
 * Does NOT delete active_chats — those conversations still exist.
 * The agent goes offline so they stop receiving new chats.
 */
export async function markAgentOffline(
  tenantId: string,
  userId: string
): Promise<void> {
  await redisClient.pipeline()
    .hset(keys.agentState(tenantId, userId), "presence", "offline")
    .srem(keys.onlineAgents(tenantId), userId)
    .exec();
}

/**
 * Returns all online agent userIds for the tenant.
 */
export async function getOnlineAgentIds(tenantId: string): Promise<string[]> {
  return redisClient.smembers(keys.onlineAgents(tenantId));
}

/**
 * Returns the skill IDs assigned to an agent.
 */
export async function getAgentSkillIds(
  tenantId: string,
  userId: string
): Promise<Set<string>> {
  const members = await redisClient.smembers(keys.agentSkills(tenantId, userId));
  return new Set(members);
}

/**
 * Returns the current active-chat count for an agent.
 */
export async function getActiveChatsCount(
  tenantId: string,
  userId: string
): Promise<number> {
  const val = await redisClient.get(keys.agentActiveChats(tenantId, userId));
  return parseInt(val ?? "0", 10);
}

/**
 * Atomically checks capacity and increments active_chats using a Lua script.
 * Returns true if the slot was successfully claimed, false if at capacity.
 */
export async function tryClaimChatSlot(
  tenantId: string,
  userId: string
): Promise<boolean> {
  const result = await redisClient.eval(
    LUA_TRY_ASSIGN,
    2,
    keys.agentActiveChats(tenantId, userId),
    keys.agentState(tenantId, userId)
  );
  return result === 1;
}

/**
 * Decrements active_chats, floored at 0 to guard against any drift.
 * Returns the new count.
 */
export async function releaseChatSlot(
  tenantId: string,
  userId: string
): Promise<number> {
  const lua = `
    local current = tonumber(redis.call('GET', KEYS[1])) or 0
    if current > 0 then
      return redis.call('DECR', KEYS[1])
    end
    return 0
  `;
  const result = await redisClient.eval(
    lua,
    1,
    keys.agentActiveChats(tenantId, userId)
  );
  return result as number;
}

/**
 * Finds all online agents for a tenant who hold the given skill and
 * returns them with their current active_chats count, sorted ascending (LAR).
 * The Redis fan-out is done in a single pipeline to minimise round-trips.
 */
export async function getEligibleAgents(
  tenantId: string,
  skillId: string
): Promise<Array<{ userId: string; activeChats: number }>> {
  const onlineIds = await getOnlineAgentIds(tenantId);
  if (onlineIds.length === 0) return [];

  // Fan-out: check each online agent's skill set and active chat count in
  // one pipeline — one round-trip regardless of agent count.
  const pipeline = redisClient.pipeline();
  for (const uid of onlineIds) {
    pipeline.sismember(keys.agentSkills(tenantId, uid), skillId);
    pipeline.get(keys.agentActiveChats(tenantId, uid));
  }
  const results = await pipeline.exec();

  const eligible: Array<{ userId: string; activeChats: number }> = [];
  for (let i = 0; i < onlineIds.length; i++) {
    const hasSkill = results![i * 2]?.[1] === 1;
    const activeChats = parseInt((results![i * 2 + 1]?.[1] as string) ?? "0", 10);
    if (hasSkill) {
      eligible.push({ userId: onlineIds[i], activeChats });
    }
  }

  // Sort by active_chats ascending — Least Active Routing
  return eligible.sort((a, b) => a.activeChats - b.activeChats);
}
