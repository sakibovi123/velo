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
  visitorMeta?: Record<string, (...args: any[]) => void>;
}

type IoServer = Server<
  Record<string, (...args: any[]) => void>,
  Record<string, (...args: any[]) => void>,
  Record<string, (...args: any[]) => void>,
  SocketData
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function persistAndNotifyAssignment(
  io: IoServer,
  workspaceId: string,
  agentUserId: string,
  chatId: string,
  visitorSocketId: string
): Promise<void> {
  try {
    await updateConversation(chatId, {
      assigned_agent: agentUserId,
      status: "open",
      visitor_socket_id: visitorSocketId,
    });
  } catch (err) {
    console.error(`[routing] Failed to persist assignment for chatId=${chatId}:`, err);
  }

  io.to(`user:${workspaceId}:${agentUserId}`).emit("chat:assigned", {
    chatId,
    visitorSocketId,
  });

  io.to(visitorSocketId).emit("chat:agentJoined", {
    chatId,
    agentUserId,
  });

  console.log(
    `[routing] assigned chatId=${chatId} → agentUserId=${agentUserId} workspace=${workspaceId}`
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

export async function routeNewChat(
  io: IoServer,
  workspaceId: string,
  visitorSocketId: string,
  payload: ChatStartPayload
): Promise<void> {
  const { chatId, requiredSkillId, visitorName, visitorEmail, visitorMeta } = payload;

  try {
    await createConversation({
      id: chatId,
      workspace: workspaceId,
      visitor_name: visitorName ?? "Visitor",
      visitor_email: visitorEmail ?? "",
      visitor_socket_id: visitorSocketId,
      required_skill: requiredSkillId,
      status: "pending",
      visitor_meta: visitorMeta ?? {},
    });
  } catch (err) {
    console.error(`[routing] Failed to persist new conversation chatId=${chatId}:`, err);
  }

  io.to(`workspace:${workspaceId}`).emit("conversation:new", {
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

  const candidates = await getEligibleAgents(workspaceId, requiredSkillId);

  for (const { userId: agentUserId } of candidates) {
    const claimed = await tryClaimChatSlot(workspaceId, agentUserId);
    if (claimed) {
      await persistAndNotifyAssignment(io, workspaceId, agentUserId, chatId, visitorSocketId);
      return;
    }
  }

  const queuedChat: QueuedChat = {
    chatId,
    workspaceId,
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
  workspaceId: string,
  agentUserId: string,
  chatId: string
): Promise<void> {
  try {
    await updateConversation(chatId, { status: "resolved" });
  } catch (err) {
    console.error(`[routing] Failed to persist resolved status for chatId=${chatId}:`, err);
  }

  io.to(`workspace:${workspaceId}`).emit("conversation:updated", {
    conversationId: chatId,
    update: { status: "resolved" },
  });

  await releaseChatSlot(workspaceId, agentUserId);

  const skillIds = await getAgentSkillIds(workspaceId, agentUserId);
  if (skillIds.size === 0) return;

  for (const skillId of skillIds) {
    const queued = await dequeueOldestChat(workspaceId, skillId);
    if (!queued) continue;

    const claimed = await tryClaimChatSlot(workspaceId, agentUserId);
    if (claimed) {
      await persistAndNotifyAssignment(
        io,
        workspaceId,
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
  workspaceId: string,
  userId: string
): Promise<void> {
  await markAgentOffline(workspaceId, userId);
  console.log(`[routing] agent offline on disconnect | userId=${userId} workspace=${workspaceId}`);
}
