import { create } from "zustand";
import { getSocket, disconnectSocket } from "@/lib/socket";
import api from "@/lib/axios";

/**
 * Inbox store — owns all conversation state and the socket lifecycle.
 *
 * Shape of a conversation object:
 * {
 *   id:           string (UUID)
 *   visitorName:  string
 *   visitorEmail: string | null
 *   status:       "open" | "pending" | "resolved"
 *   unread:       number
 *   lastMessage:  string
 *   updatedAt:    number (epoch ms)
 *   messages: [
 *     { id, text, sender: "visitor"|"agent", timestamp }
 *   ]
 * }
 */

const useInboxStore = create((set, get) => ({
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  conversations: [],
  activeConversationId: null,
  isConnected: false,
  isLoading: false,
  error: null,

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * Boot the socket, register all event handlers, then sync agent presence.
   * Call once after login — ChatList triggers this on mount.
   */
  async init(token) {
    const socket = getSocket(token);

    socket.on("connect", () => set({ isConnected: true }));
    socket.on("disconnect", () => set({ isConnected: false }));

    // A new conversation arrived (new visitor started a chat)
    socket.on("conversation:new", (conversation) => {
      set((state) => ({
        conversations: [conversation, ...state.conversations],
      }));
    });

    // A new message arrived on an existing conversation
    socket.on("message:incoming", ({ conversationId, message }) => {
      set((state) => ({
        conversations: state.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          const isActive = state.activeConversationId === conversationId;
          return {
            ...c,
            messages: [...(c.messages ?? []), message],
            lastMessage: message.text,
            updatedAt: message.timestamp,
            unread: isActive ? 0 : c.unread + 1,
          };
        }),
      }));
    });

    // Conversation status changed (e.g. resolved by another agent)
    socket.on("conversation:updated", ({ conversationId, update }) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, ...update } : c
        ),
      }));
    });

    // Routing engine assigned a chat to this agent — auto-open it
    socket.on("chat:assigned", ({ chatId }) => {
      set((state) => {
        // If the conversation already exists in the list, just surface it
        const exists = state.conversations.some((c) => c.id === chatId);
        const newConversation = exists ? null : {
          id: chatId,
          visitorName: "Visitor",
          visitorEmail: null,
          status: "open",
          unread: 0,
          lastMessage: "",
          updatedAt: Date.now(),
          messages: [],
        };
        return {
          activeConversationId: chatId,
          conversations: newConversation
            ? [newConversation, ...state.conversations]
            : state.conversations,
        };
      });
    });

    socket.connect();

    // After connecting, fetch the agent's own profile from Django and emit
    // agent:setPresence so the routing engine knows this agent is available.
    // We wait for the connect event via a one-time listener to guarantee the
    // socket is open before emitting.
    socket.once("connect", async () => {
      try {
        const { data } = await api.get("/agents/me/");
        const profile = data.data;
        socket.emit("agent:setPresence", {
          presence: "online",
          skillIds: profile.skills.map((s) => s.id),
          maxChatCapacity: profile.max_chat_capacity,
        });
      } catch (err) {
        console.error("[inboxStore] Failed to sync agent presence:", err);
      }
    });
  },

  teardown() {
    // Tell the server we're going offline before disconnecting
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("agent:setPresence", { presence: "offline" });
    }
    disconnectSocket();
    set({ conversations: [], activeConversationId: null, isConnected: false });
  },

  setActiveConversation(id) {
    set((state) => ({
      activeConversationId: id,
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, unread: 0 } : c
      ),
    }));
  },

  /** Load full message history for a conversation from the REST API. */
  async loadMessages(conversationId) {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/conversations/${conversationId}/messages/`);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, messages: data.data } : c
        ),
      }));
    } catch (err) {
      set({ error: err.response?.data?.error?.message ?? "Failed to load messages." });
    } finally {
      set({ isLoading: false });
    }
  },

  /** Send an agent reply. */
  sendMessage(text) {
    const { activeConversationId, isConnected } = get();
    if (!activeConversationId || !isConnected || !text.trim()) return;

    const socket = getSocket();
    const message = {
      id: crypto.randomUUID(),
      text: text.trim(),
      sender: "agent",
      timestamp: Date.now(),
    };

    socket.emit("message:send", { conversationId: activeConversationId, message });

    // Optimistic update
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === activeConversationId
          ? { ...c, messages: [...(c.messages ?? []), message], lastMessage: message.text, updatedAt: message.timestamp }
          : c
      ),
    }));
  },

  /**
   * Change conversation status.
   * When set to "resolved", also emits chat:end to trigger queue drain
   * so the next waiting visitor can be assigned to this agent.
   */
  setConversationStatus(conversationId, status) {
    const socket = getSocket();

    // Optimistic local update
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, status } : c
      ),
    }));

    if (status === "resolved") {
      // Release the capacity slot and drain the skill queues
      socket.emit("chat:end", { chatId: conversationId });
    }
  },
}));

export default useInboxStore;
