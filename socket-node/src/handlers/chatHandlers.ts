import type { Server, Socket } from "socket.io";
import type { SocketData } from "../middleware/socketAuth.js";
import {
  syncAgentState,
  setPresence,
  type PresenceStatus,
} from "../routing/agentStateService.js";
import {
  routeNewChat,
  handleChatEnd,
  handleAgentDisconnect,
  type ChatStartPayload,
} from "../routing/routingEngine.js";
import { createMessage } from "../lib/djangoClient.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type IoServer = Server<
  Record<string, (...args: any[]) => void>,
  Record<string, (...args: any[]) => void>,
  Record<string, (...args: any[]) => void>,
  SocketData
>;

type AppSocket = Socket<
  Record<string, (...args: any[]) => void>,
  Record<string, (...args: any[]) => void>,
  Record<string, (...args: any[]) => void>,
  SocketData
>;

interface SetPresencePayload {
  presence: PresenceStatus;
  skillIds?: string[];
  maxChatCapacity?: number;
}

interface MessageSendPayload {
  conversationId: string;
  text: string;
}

interface ChatEndPayload {
  chatId: string;
}

// ─── Handler registration ─────────────────────────────────────────────────────

export function registerChatHandlers(io: IoServer, socket: AppSocket): void {
  const { role, userId, tenantId } = socket.data;

  // ── Agent-only handlers ────────────────────────────────────────────────────

  if (role === "agent" && userId) {
    socket.join(`user:${tenantId}:${userId}`);

    /**
     * agent:setPresence
     * Payload: { presence, skillIds?, maxChatCapacity? }
     */
    socket.on("agent:setPresence", async (payload: SetPresencePayload) => {
      try {
        const { presence, skillIds, maxChatCapacity } = payload;

        if (skillIds !== undefined && maxChatCapacity !== undefined) {
          await syncAgentState(tenantId, userId, skillIds, maxChatCapacity, presence);
        } else {
          await setPresence(tenantId, userId, presence);
        }

        socket.to(`agents:${tenantId}`).emit("agent:presenceUpdate", {
          userId,
          presence,
        });
        socket.emit("agent:presenceAck", { success: true });
      } catch (err) {
        console.error("[chatHandlers] agent:setPresence error:", err);
        socket.emit("agent:presenceAck", {
          success: false,
          error: "Failed to update presence.",
        });
      }
    });

    /**
     * message:send (agent)
     * Agent replies to a visitor inside a conversation.
     * Payload: { conversationId, text }
     */
    socket.on("message:send", async (payload: MessageSendPayload) => {
      const { conversationId, text } = payload;
      if (!conversationId || !text?.trim()) return;

      const message = {
        id: crypto.randomUUID(),
        sender_type: "agent" as const,
        sender_agent: userId,
        text: text.trim(),
        timestamp: Date.now(),
      };

      // 1. Broadcast to visitor socket (the conversation room)
      io.to(`conversation:${conversationId}`).emit("message:incoming", {
        conversationId,
        message,
      });

      // 2. Broadcast to all other agents viewing this conversation
      socket.to(`tenant:${tenantId}`).emit("message:incoming", {
        conversationId,
        message,
      });

      // 3. Persist to Django (non-blocking — failure logged, not thrown)
      createMessage(conversationId, {
        sender_type: "agent",
        sender_agent: userId,
        text: message.text,
      }).catch((err) =>
        console.error(`[chatHandlers] Failed to persist agent message:`, err)
      );
    });

    /**
     * chat:end
     * Agent resolved/closed a conversation.
     * Payload: { chatId }
     */
    socket.on("chat:end", async (payload: ChatEndPayload) => {
      try {
        const { chatId } = payload;

        socket.to(`tenant:${tenantId}`).emit("chat:closed", {
          chatId,
          closedBy: userId,
          closedAt: Date.now(),
        });

        // Pass chatId so routingEngine can persist "resolved" status
        await handleChatEnd(io, tenantId, userId, chatId);
      } catch (err) {
        console.error("[chatHandlers] chat:end error:", err);
      }
    });

    socket.on("disconnect", async () => {
      await handleAgentDisconnect(tenantId, userId);
    });
  }

  // ── Visitor-only handlers ──────────────────────────────────────────────────

  if (role === "visitor") {
    /**
     * chat:start
     * Visitor opens a new conversation. Triggers skill-based routing.
     * Payload: { chatId, requiredSkillId, visitorName?, visitorEmail?, visitorMeta? }
     */
    socket.on("chat:start", async (payload: ChatStartPayload) => {
      try {
        if (!payload.chatId || !payload.requiredSkillId) {
          socket.emit("chat:error", {
            code: "invalid_payload",
            message: "chatId and requiredSkillId are required.",
          });
          return;
        }

        // Join a room keyed by chatId so agent messages reach this socket
        socket.join(`conversation:${payload.chatId}`);

        await routeNewChat(io, tenantId, socket.id, payload);
      } catch (err) {
        console.error("[chatHandlers] chat:start error:", err);
        socket.emit("chat:error", {
          code: "routing_failed",
          message: "Could not route your chat. Please try again.",
        });
      }
    });

    /**
     * message:send (visitor)
     * Visitor sends a message inside an active conversation.
     * Payload: { conversationId, text }
     */
    socket.on("message:send", async (payload: MessageSendPayload) => {
      const { conversationId, text } = payload;
      if (!conversationId || !text?.trim()) return;

      const message = {
        id: crypto.randomUUID(),
        sender_type: "visitor" as const,
        text: text.trim(),
        timestamp: Date.now(),
      };

      // 1. Broadcast to the assigned agent's tenant room
      io.to(`tenant:${tenantId}`).emit("message:incoming", {
        conversationId,
        message,
      });

      // 2. Persist to Django (non-blocking)
      createMessage(conversationId, {
        sender_type: "visitor",
        text: message.text,
      }).catch((err) =>
        console.error(`[chatHandlers] Failed to persist visitor message:`, err)
      );
    });

    socket.on("disconnect", () => {
      console.log(`[socket] visitor disconnected | tenant=${tenantId} id=${socket.id}`);
    });
  }
}
