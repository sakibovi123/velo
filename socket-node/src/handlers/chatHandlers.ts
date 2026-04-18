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
  const { role, userId, workspaceId } = socket.data;

  // ── Agent-only handlers ────────────────────────────────────────────────────

  if (role === "agent" && userId) {
    socket.join(`user:${workspaceId}:${userId}`);

    socket.on("agent:setPresence", async (payload: SetPresencePayload) => {
      try {
        const { presence, skillIds, maxChatCapacity } = payload;

        if (skillIds !== undefined && maxChatCapacity !== undefined) {
          await syncAgentState(workspaceId, userId, skillIds, maxChatCapacity, presence);
        } else {
          await setPresence(workspaceId, userId, presence);
        }

        socket.to(`agents:${workspaceId}`).emit("agent:presenceUpdate", {
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

      io.to(`conversation:${conversationId}`).emit("message:incoming", {
        conversationId,
        message,
      });

      socket.to(`workspace:${workspaceId}`).emit("message:incoming", {
        conversationId,
        message,
      });

      createMessage(conversationId, {
        sender_type: "agent",
        sender_agent: userId,
        text: message.text,
      }).catch((err) =>
        console.error(`[chatHandlers] Failed to persist agent message:`, err)
      );
    });

    socket.on("chat:end", async (payload: ChatEndPayload) => {
      try {
        const { chatId } = payload;

        socket.to(`workspace:${workspaceId}`).emit("chat:closed", {
          chatId,
          closedBy: userId,
          closedAt: Date.now(),
        });

        await handleChatEnd(io, workspaceId, userId, chatId);
      } catch (err) {
        console.error("[chatHandlers] chat:end error:", err);
      }
    });

    socket.on("disconnect", async () => {
      await handleAgentDisconnect(workspaceId, userId);
    });
  }

  // ── Visitor-only handlers ──────────────────────────────────────────────────

  if (role === "visitor") {
    socket.on("chat:start", async (payload: ChatStartPayload) => {
      try {
        if (!payload.chatId || !payload.requiredSkillId) {
          socket.emit("chat:error", {
            code: "invalid_payload",
            message: "chatId and requiredSkillId are required.",
          });
          return;
        }

        socket.join(`conversation:${payload.chatId}`);

        await routeNewChat(io, workspaceId, socket.id, payload);
      } catch (err) {
        console.error("[chatHandlers] chat:start error:", err);
        socket.emit("chat:error", {
          code: "routing_failed",
          message: "Could not route your chat. Please try again.",
        });
      }
    });

    socket.on("message:send", async (payload: MessageSendPayload) => {
      const { conversationId, text } = payload;
      if (!conversationId || !text?.trim()) return;

      const message = {
        id: crypto.randomUUID(),
        sender_type: "visitor" as const,
        text: text.trim(),
        timestamp: Date.now(),
      };

      io.to(`workspace:${workspaceId}`).emit("message:incoming", {
        conversationId,
        message,
      });

      createMessage(conversationId, {
        sender_type: "visitor",
        text: message.text,
      }).catch((err) =>
        console.error(`[chatHandlers] Failed to persist visitor message:`, err)
      );
    });

    socket.on("disconnect", () => {
      console.log(`[socket] visitor disconnected | workspace=${workspaceId} id=${socket.id}`);
    });
  }
}
