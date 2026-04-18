import { redisClient } from "../lib/redisClient.js";

// ─── Key helpers ──────────────────────────────────────────────────────────────

const queueKey = (workspaceId: string, skillId: string) =>
  `queue:${workspaceId}:${skillId}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueuedChat {
  chatId: string;
  workspaceId: string;
  visitorSocketId: string;
  requiredSkillId: string;
  enqueuedAt: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function enqueueChat(chat: QueuedChat): Promise<void> {
  await redisClient.zadd(
    queueKey(chat.workspaceId, chat.requiredSkillId),
    chat.enqueuedAt,
    JSON.stringify(chat)
  );
}

export async function dequeueOldestChat(
  workspaceId: string,
  skillId: string
): Promise<QueuedChat | null> {
  const result = await redisClient.zpopmin(queueKey(workspaceId, skillId), 1);
  if (!result || result.length === 0) return null;

  const member = result[0];
  if (!member) return null;

  try {
    return JSON.parse(member) as QueuedChat;
  } catch {
    console.error("[queueService] Failed to parse queued chat:", member);
    return null;
  }
}

export async function getQueueLength(
  workspaceId: string,
  skillId: string
): Promise<number> {
  return redisClient.zcard(queueKey(workspaceId, skillId));
}

export async function peekQueue(
  workspaceId: string,
  skillId: string
): Promise<QueuedChat[]> {
  const members = await redisClient.zrange(queueKey(workspaceId, skillId), 0, -1);
  return members
    .map((m) => {
      try {
        return JSON.parse(m) as QueuedChat;
      } catch {
        return null;
      }
    })
    .filter((c): c is QueuedChat => c !== null);
}
