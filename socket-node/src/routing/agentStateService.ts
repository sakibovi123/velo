import { redisClient } from "../lib/redisClient.js";

// ─── Key helpers ──────────────────────────────────────────────────────────────

const keys = {
  agentState: (wid: string, uid: string) => `agent:${wid}:${uid}:state`,
  agentActiveChats: (wid: string, uid: string) => `agent:${wid}:${uid}:active_chats`,
  agentSkills: (wid: string, uid: string) => `agent:${wid}:${uid}:skills`,
  onlineAgents: (wid: string) => `workspace:${wid}:agents:online`,
};

// ─── Lua: atomic capacity-check + increment ───────────────────────────────────
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

export async function syncAgentState(
  workspaceId: string,
  userId: string,
  skillIds: string[],
  maxCapacity: number,
  presence: PresenceStatus
): Promise<void> {
  const stateKey = keys.agentState(workspaceId, userId);
  const skillsKey = keys.agentSkills(workspaceId, userId);
  const onlineKey = keys.onlineAgents(workspaceId);
  const activeChatKey = keys.agentActiveChats(workspaceId, userId);

  const pipeline = redisClient.pipeline();

  pipeline.hset(stateKey, { presence, maxCapacity: String(maxCapacity) });

  pipeline.del(skillsKey);
  if (skillIds.length > 0) {
    pipeline.sadd(skillsKey, ...skillIds);
  }

  pipeline.setnx(activeChatKey, "0");

  if (presence === "online") {
    pipeline.sadd(onlineKey, userId);
  } else {
    pipeline.srem(onlineKey, userId);
  }

  await pipeline.exec();
}

export async function setPresence(
  workspaceId: string,
  userId: string,
  presence: PresenceStatus
): Promise<void> {
  const pipeline = redisClient.pipeline();
  pipeline.hset(keys.agentState(workspaceId, userId), "presence", presence);

  if (presence === "online") {
    pipeline.sadd(keys.onlineAgents(workspaceId), userId);
  } else {
    pipeline.srem(keys.onlineAgents(workspaceId), userId);
  }

  await pipeline.exec();
}

export async function markAgentOffline(
  workspaceId: string,
  userId: string
): Promise<void> {
  await redisClient.pipeline()
    .hset(keys.agentState(workspaceId, userId), "presence", "offline")
    .srem(keys.onlineAgents(workspaceId), userId)
    .exec();
}

export async function getOnlineAgentIds(workspaceId: string): Promise<string[]> {
  return redisClient.smembers(keys.onlineAgents(workspaceId));
}

export async function getAgentSkillIds(
  workspaceId: string,
  userId: string
): Promise<Set<string>> {
  const members = await redisClient.smembers(keys.agentSkills(workspaceId, userId));
  return new Set(members);
}

export async function getActiveChatsCount(
  workspaceId: string,
  userId: string
): Promise<number> {
  const val = await redisClient.get(keys.agentActiveChats(workspaceId, userId));
  return parseInt(val ?? "0", 10);
}

export async function tryClaimChatSlot(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const result = await redisClient.eval(
    LUA_TRY_ASSIGN,
    2,
    keys.agentActiveChats(workspaceId, userId),
    keys.agentState(workspaceId, userId)
  );
  return result === 1;
}

export async function releaseChatSlot(
  workspaceId: string,
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
    keys.agentActiveChats(workspaceId, userId)
  );
  return result as number;
}

export async function getEligibleAgents(
  workspaceId: string,
  skillId: string
): Promise<Array<{ userId: string; activeChats: number }>> {
  const onlineIds = await getOnlineAgentIds(workspaceId);
  if (onlineIds.length === 0) return [];

  const pipeline = redisClient.pipeline();
  for (const uid of onlineIds) {
    pipeline.sismember(keys.agentSkills(workspaceId, uid), skillId);
    pipeline.get(keys.agentActiveChats(workspaceId, uid));
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

  return eligible.sort((a, b) => a.activeChats - b.activeChats);
}
