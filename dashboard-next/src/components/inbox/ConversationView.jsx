"use client";

import { useState, useEffect, useRef } from "react";
import useInboxStore from "@/store/inboxStore";

export default function ConversationView() {
  const conversations = useInboxStore((s) => s.conversations);
  const activeId = useInboxStore((s) => s.activeConversationId);
  const sendMessage = useInboxStore((s) => s.sendMessage);
  const setStatus = useInboxStore((s) => s.setConversationStatus);
  const isLoading = useInboxStore((s) => s.isLoading);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const [draft, setDraft] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages?.length]);

  function handleSend(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  }

  function handleSetStatus(s) {
    setStatus(active.id, s);
    // chat:end is emitted inside setConversationStatus when status === "resolved"
  }

  if (!active) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400 bg-gray-50">
        Select a conversation to get started
      </div>
    );
  }

  const isResolved = active.status === "resolved";

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Conversation header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{active.visitorName}</h3>
          {active.visitorEmail && (
            <p className="text-xs text-gray-500">{active.visitorEmail}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {["open", "pending", "resolved"].map((s) => (
            <button
              key={s}
              onClick={() => handleSetStatus(s)}
              className={[
                "px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors",
                active.status === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Resolved banner */}
      {isResolved && (
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 text-center">
          This conversation is resolved. Click <strong>open</strong> to reopen it.
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {isLoading && (
          <p className="text-center text-xs text-gray-400 py-4">Loading messages…</p>
        )}
        {(active.messages ?? []).map((msg) => {
          const isAgent = msg.sender === "agent" || msg.sender_type === "agent";
          return (
            <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
              <div
                className={[
                  "max-w-[65%] rounded-2xl px-4 py-2 text-sm",
                  isAgent
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm",
                ].join(" ")}
              >
                <p className="leading-relaxed">{msg.text}</p>
                <span className={`block text-[10px] mt-1 text-right ${isAgent ? "text-indigo-200" : "text-gray-400"}`}>
                  {new Date(msg.timestamp ?? msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar — disabled when resolved */}
      <form onSubmit={handleSend} className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isResolved ? "Conversation resolved" : "Type a reply…"}
          disabled={isResolved}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isResolved}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
