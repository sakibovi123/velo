import { create } from "zustand";
import { getSocket, disconnectSocket } from "@/lib/socket";
import api from "@/lib/axios";

/**
 * Normalize a conversation from the Django REST shape (snake_case) into the
 * camelCase shape the UI components consume. We also keep the snake_case
 * keys so newer components can read either.
 */
function normalizeConversation(c) {
  if (!c) return c;
  return {
    ...c,
    id: c.id,
    visitorName: c.visitorName ?? c.visitor_name ?? "Visitor",
    visitorEmail: c.visitorEmail ?? c.visitor_email ?? null,
    visitorMeta: c.visitorMeta ?? c.visitor_meta ?? {},
    status: c.status ?? "open",
    unread: c.unread ?? 0,
    lastMessage:
      c.lastMessage ??
      (Array.isArray(c.messages) && c.messages.length
        ? c.messages[c.messages.length - 1].text
        : ""),
    updatedAt:
      c.updatedAt ??
      (c.updated_at ? new Date(c.updated_at).getTime() : Date.now()),
    messages: c.messages ?? [],
    tags: c.tags ?? [],
    assignedAgent: c.assignedAgent ?? c.assigned_agent ?? null,
    snoozedUntil: c.snoozedUntil ?? c.snoozed_until ?? null,
    firstReplyAt: c.firstReplyAt ?? c.first_reply_at ?? null,
    slaFirstReplyMinutes:
      c.slaFirstReplyMinutes ?? c.sla_first_reply_minutes ?? 15,
    slaResolutionMinutes:
      c.slaResolutionMinutes ?? c.sla_resolution_minutes ?? 1440,
  };
}

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
  agents: [],          // assignable workspace members
  tags: [],            // workspace tags
  me: null,            // current agent profile (incl. preferred_language)
  workspace: null,     // current workspace (incl. default_language, agent_languages)
  showOriginal: {},    // { [messageId]: true }  → render original instead of translation
  autoTranslateReply: true,  // composer toggle: translate before sending

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
      const c = normalizeConversation(conversation);
      set((state) =>
        state.conversations.some((x) => x.id === c.id)
          ? state
          : { conversations: [c, ...state.conversations] }
      );
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

    // Hydrate state from REST in parallel with socket connecting.
    get().loadConversations();
    get().loadAgents();
    get().loadTags();
    get().loadMe();
    get().loadWorkspace();

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

  // ===========================================================================
  // Inbox v2: assignment, internal notes, snooze, merge, tags, SLA
  // ===========================================================================

  /** Patch a single conversation's fields locally (used after REST mutations). */
  _patchConversation(conversationId, patch) {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, ...patch } : c
      ),
    }));
  },

  /** Hydrate the conversation list from Django REST. */
  async loadConversations() {
    try {
      const { data } = await api.get("/conversations/");
      const fresh = (data.data ?? []).map(normalizeConversation);
      set((state) => {
        // Merge: prefer REST data, but keep any in-memory unread counts and
        // messages for conversations the agent is actively looking at.
        const byId = new Map(fresh.map((c) => [c.id, c]));
        for (const local of state.conversations) {
          const remote = byId.get(local.id);
          if (remote) {
            byId.set(local.id, {
              ...remote,
              unread: local.unread ?? remote.unread,
              // keep locally-loaded messages if the REST response didn't include them
              messages: remote.messages?.length ? remote.messages : local.messages,
            });
          } else {
            // local-only conversation (newly arrived via socket before hydration)
            byId.set(local.id, local);
          }
        }
        return { conversations: Array.from(byId.values()) };
      });
    } catch (err) {
      console.error("[inboxStore] loadConversations failed", err);
    }
  },

  // ----- Agents ----------------------------------------------------------
  async loadAgents() {
    try {
      const { data } = await api.get("/agents/assignable/");
      set({ agents: data.data });
    } catch (err) {
      console.error("[inboxStore] loadAgents failed", err);
    }
  },

  // ----- Tags ------------------------------------------------------------
  async loadTags() {
    try {
      const { data } = await api.get("/conversations/tags/");
      set({ tags: data.data });
    } catch (err) {
      console.error("[inboxStore] loadTags failed", err);
    }
  },

  async createTag(name, color = "#6366f1") {
    const { data } = await api.post("/conversations/tags/", { name, color });
    set((state) => ({ tags: [...state.tags, data.data] }));
    return data.data;
  },

  async deleteTag(tagId) {
    await api.delete(`/conversations/tags/${tagId}/`);
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== tagId),
      conversations: state.conversations.map((c) => ({
        ...c,
        tags: (c.tags ?? []).filter((t) => t.id !== tagId),
      })),
    }));
  },

  async setConversationTags(conversationId, tagIds) {
    const { data } = await api.put(
      `/conversations/${conversationId}/tags/`,
      { tag_ids: tagIds }
    );
    get()._patchConversation(conversationId, { tags: data.data.tags });
  },

  // ----- Assignment ------------------------------------------------------
  async assignConversation(conversationId, agentId) {
    const { data } = await api.post(
      `/conversations/${conversationId}/assign/`,
      { agent_id: agentId }
    );
    get()._patchConversation(conversationId, {
      assignedAgent: data.data.assigned_agent,
      assigned_agent: data.data.assigned_agent,
    });
  },

  // ----- Internal notes --------------------------------------------------
  async addInternalNote(conversationId, text) {
    const { data } = await api.post(
      `/conversations/${conversationId}/notes/`,
      { text }
    );
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...(c.messages ?? []), data.data] }
          : c
      ),
    }));
  },

  // ----- Snooze ----------------------------------------------------------
  async snoozeConversation(conversationId, untilIso) {
    const { data } = await api.post(
      `/conversations/${conversationId}/snooze/`,
      { until: untilIso }
    );
    get()._patchConversation(conversationId, {
      status: "snoozed",
      snoozedUntil: data.data.snoozed_until,
      snoozed_until: data.data.snoozed_until,
    });
  },

  async unsnoozeConversation(conversationId) {
    await api.post(`/conversations/${conversationId}/unsnooze/`);
    get()._patchConversation(conversationId, {
      status: "open",
      snoozedUntil: null,
      snoozed_until: null,
    });
  },

  // ----- Merge -----------------------------------------------------------
  async mergeConversations(targetId, sourceId) {
    const { data } = await api.post(
      `/conversations/${targetId}/merge/`,
      { source_id: sourceId }
    );
    set((state) => ({
      conversations: state.conversations
        .filter((c) => c.id !== sourceId)
        .map((c) =>
          c.id === targetId
            ? { ...c, messages: data.data.messages ?? c.messages }
            : c
        ),
      activeConversationId:
        state.activeConversationId === sourceId
          ? targetId
          : state.activeConversationId,
    }));
  },

  // ----- Translation -----------------------------------------------------
  async loadMe() {
    try {
      const { data } = await api.get("/agents/me/");
      set({ me: data.data });
    } catch (err) {
      console.error("[inboxStore] loadMe failed", err);
    }
  },

  async updateMe(patch) {
    const { data } = await api.patch("/agents/me/", patch);
    set({ me: data.data });
    return data.data;
  },

  async loadWorkspace() {
    try {
      const { data } = await api.get("/workspaces/me/");
      set({ workspace: data.data });
    } catch (err) {
      console.error("[inboxStore] loadWorkspace failed", err);
    }
  },

  async updateWorkspace(patch) {
    const { data } = await api.patch("/workspaces/me/", patch);
    set({ workspace: data.data });
    return data.data;
  },

  toggleShowOriginal(messageId) {
    set((state) => ({
      showOriginal: {
        ...state.showOriginal,
        [messageId]: !state.showOriginal[messageId],
      },
    }));
  },

  setAutoTranslateReply(value) {
    set({ autoTranslateReply: !!value });
  },

  /**
   * Translate composer draft into a target language for live preview.
   * Returns the translated string, or "" on failure.
   */
  async translateReplyDraft(conversationId, text, targetLang) {
    if (!text?.trim() || !targetLang) return "";
    try {
      const { data } = await api.post(
        `/conversations/${conversationId}/translate-reply/`,
        { text, target_lang: targetLang }
      );
      return data.data?.translated || "";
    } catch (err) {
      console.error("[inboxStore] translateReplyDraft failed", err);
      return "";
    }
  },
}));

export default useInboxStore;
