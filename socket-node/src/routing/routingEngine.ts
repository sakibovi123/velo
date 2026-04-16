import type { Server } from "socket.io";
import type { SocketData } from "../middleware/socketAuth.js";
import {
  getEligibleAgents,
  tryClaimChatSlot,
  releaseChatSlot,
  getAgentSkillIds,
  markAgentOffline,
} from "./agentStateService.js";
import {
  enqueueChat,
  dequeueOldestChat,
  type QueuedChat,
} from "./queueService.js";
import {
  createConversation,
  updateConversation,
} from "../lib/djangoClient.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatStartPayload {
  chatId: string;
  requiredSkillId: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorMeta?: Record<string, unknown>;
}

type IoServer = Server<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function persistAndNotifyAssignment(
  io: IoServer,
  tenantId: string,
  agentUserId: string,
  chatId: string,
  visitorSocketId: string
): Promise<void> {
  // Persist assignment to Django DB
  try {
    await updateConversation(chatId, {
      assigned_agent: agentUserId,
      status: "open",
      visitor_socket_id: visitorSocketId,
    });
  } catch (err) {
    console.error(`[routing] Failed to persist assignment for chatId=${chatId}:`, err);
    // Non-fatal — routing already happened in Redis; DB write failure is logged
  }

  // Notify agent — opens the conversation panel in the dashboard
  io.to(`user:${tenantId}:${agentUserId}`).emit("chat:assigned", {
    chatId,
    visitorSocketId,
  });

  // Notify visitor — widget shows "agent joined"
  io.to(visitorSocketId).emit("chat:agentJoined", {
    chatId,
    agentUserId,
  });

  console.log(
    `[routing] assigned chatId=${chatId} → agentUserId=${agentUserId} tenant=${tenantId}`
  );
}

function notifyQueued(
  io: IoServer,
  visitorSocketId: string,
  chatId: string,
  skillId: string
): void {
  io.to(visitorSocketId).emit("chat:queued", {
    chatId,
    message: "All agents are currently busy. You have been added to the queue.",
  });
  console.log(`[routing] queued chatId=${chatId} skillId=${skillId}`);
}

// ─── Core routing ─────────────────────────────────────────────────────────────

/**
 * Called when a visitor starts a new chat.
 *
 * 1. Persist a new Conversation in Django (status: "pending")
 * 2. Broadcast conversation:new to all agents in the tenant room
 * 3. Skill Filter + Capacity Filter + LAR — find best available agent
 * 4. Atomic slot claim → assign, or enqueue if no agent available
 */
export async function routeNewChat(
  io: IoServer,
  tenantId: string,
  visitorSocketId: string,
  payload: ChatStartPayload
): Promise<void> {
  const { chatId, requiredSkillId, visitorName, visitorEmail, visitorMeta } = payload;

  // Step 1 — Persist Conversation to Django
  try {
    await createConversation({
      id: chatId,
      tenant: tenantId,
      visitor_name: visitorName ?? "Visitor",
      visitor_email: visitorEmail ?? "",
      visitor_socket_id: visitorSocketId,
      required_skill: requiredSkillId,
      status: "pending",
      visitor_meta: visitorMeta ?? {},
    });
  } catch (err) {
    console.error(`[routing] Failed to persist new conversation chatId=${chatId}:`, err);
    // Still attempt routing — partial failure shouldn't block the visitor
  }

  // Step 2 — Broadcast conversation:new so agent dashboards update in real time
  io.to(`tenant:${tenantId}`).emit("conversation:new", {
    id: chatId,
    visitorName: visitorName ?? "Visitor",
    visitorEmail: visitorEmail ?? null,
    status: "pending",
    requiredSkillId,
    unread: 1,
    lastMessage: "",
    updatedAt: Date.now(),
    messages: [],
  });

  // Steps 3 + 4 — Routing
  const candidates = await getEligibleAgents(tenantId, requiredSkillId);

  for (const { userId: agentUserId } of candidates) {
    const claimed = await tryClaimChatSlot(tenantId, agentUserId);
    if (claimed) {
      await persistAndNotifyAssignment(io, tenantId, agentUserId, chatId, visitorSocketId);
      return;
    }
  }

  // No eligible agent — enqueue
  const queuedChat: QueuedChat = {
    chatId,
    tenantId,
    visitorSocketId,
    requiredSkillId,
    enqueuedAt: Date.now(),
  };
  await enqueueChat(queuedChat);
  notifyQueued(io, visitorSocketId, chatId, requiredSkillId);
}

// ─── Queue release ────────────────────────────────────────────────────────────

export async function handleChatEnd(
  io: IoServer,
  tenantId: string,
  agentUserId: string,
  chatId: string
): Promise<void> {
  // Persist resolved status to Django
  try {
    await updateConversation(chatId, { status: "resolved" });
  } catch (err) {
    console.error(`[routing] Failed to persist resolved status for chatId=${chatId}:`, err);
  }

  // Broadcast status change so all agent dashboards update
  io.to(`tenant:${tenantId}`).emit("conversation:updated", {
    conversationId: chatId,
    update: { status: "resolved" },
  });

  // Release slot
  await releaseChatSlot(tenantId, agentUserId);

  // Drain skill queues
  const skillIds = await getAgentSkillIds(tenantId, agentUserId);
  if (skillIds.size === 0) return;

  for (const skillId of skillIds) {
    const queued = await dequeueOldestChat(tenantId, skillId);
    if (!queued) continue;

    const claimed = await tryClaimChatSlot(tenantId, agentUserId);
    if (claimed) {
      await persistAndNotifyAssignment(
        io,
        tenantId,
        agentUserId,
        queued.chatId,
        queued.visitorSocketId
      );
      return;
    }

    await enqueueChat(queued);
    console.warn(`[routing] slot race on queue release — re-queued chatId=${queued.chatId}`);
    return;
  }
}

export async function handleAgentDisconnect(
  tenantId: string,
  userId: string
): Promise<void> {
  await markAgentOffline(tenantId, userId);
  console.log(`[routing] agent offline on disconnect | userId=${userId} tenant=${tenantId}`);
}
