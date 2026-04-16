import { redisClient } from "../lib/redisClient.js";

// ─── Key helpers ──────────────────────────────────────────────────────────────

const queueKey = (tenantId: string, skillId: string) =>
  `queue:${tenantId}:${skillId}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueuedChat {
  chatId: string;
  tenantId: string;
  visitorSocketId: string;
  requiredSkillId: string;
  enqueuedAt: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Push a chat request onto the skill-specific queue.
 * Uses a Sorted Set scored by timestamp so ZPOPMIN always dequeues the
 * oldest (FIFO) waiting chat — correct for support queue semantics.
 */
export async function enqueueChat(chat: QueuedChat): Promise<void> {
  await redisClient.zadd(
    queueKey(chat.tenantId, chat.requiredSkillId),
    chat.enqueuedAt,
    JSON.stringify(chat)
  );
}

/**
 * Atomically pop the oldest waiting chat from a skill queue.
 * Returns null if the queue is empty.
 */
export async function dequeueOldestChat(
  tenantId: string,
  skillId: string
): Promise<QueuedChat | null> {
  // ZPOPMIN returns [[member, score], ...] — we only need the first element
  const result = await redisClient.zpopmin(queueKey(tenantId, skillId), 1);
  if (!result || result.length === 0) return null;

  // ioredis returns a flat [member, score, member, score...] array
  const member = result[0];
  if (!member) return null;

  try {
    return JSON.parse(member) as QueuedChat;
  } catch {
    console.error("[queueService] Failed to parse queued chat:", member);
    return null;
  }
}

/**
 * Returns the number of chats waiting in a skill queue.
 * Used for monitoring / admin dashboard display.
 */
export async function getQueueLength(
  tenantId: string,
  skillId: string
): Promise<number> {
  return redisClient.zcard(queueKey(tenantId, skillId));
}

/**
 * Returns all queued chats for a skill without removing them.
 * Ordered oldest → newest.
 */
export async function peekQueue(
  tenantId: string,
  skillId: string
): Promise<QueuedChat[]> {
  const members = await redisClient.zrange(queueKey(tenantId, skillId), 0, -1);
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
