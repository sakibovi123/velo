"use client";

import { useState, useEffect, useRef } from "react";
import { Send, CheckCircle, Clock, RotateCcw, MessageSquare } from "lucide-react";
import useInboxStore from "@/store/inboxStore";

const STATUS_PILL = {
  open: "text-emerald-600 bg-emerald-50 border-emerald-200",
  pending: "text-amber-600 bg-amber-50 border-amber-200",
  resolved: "text-zinc-500 bg-zinc-100 border-zinc-200",
};

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
}

function initials(name) {
  return (name || "V").charAt(0).toUpperCase();
}

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
    e?.preventDefault();
    if (!draft.trim() || active?.status === "resolved") return;
    sendMessage(draft);
    setDraft("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!active) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#fafafa] gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm">
          <MessageSquare className="w-5 h-5 text-zinc-300" />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-medium text-zinc-600">No conversation selected</p>
          <p className="text-[12.5px] text-zinc-400 mt-0.5">Pick one from the list to start</p>
        </div>
      </div>
    );
  }

  const isResolved = active.status === "resolved";

  return (
    <div className="flex-1 h-full flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Header */}
      <div className="h-[60px] px-5 flex items-center justify-between border-b border-zinc-100 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-[13px] font-semibold text-indigo-600">{initials(active.visitorName)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-zinc-900 truncate leading-none">
              {active.visitorName || "Visitor"}
            </p>
            {active.visitorEmail && (
              <p className="text-[11.5px] text-zinc-400 mt-0.5 truncate">{active.visitorEmail}</p>
            )}
          </div>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize shrink-0 ${STATUS_PILL[active.status] || STATUS_PILL.open}`}>
            {active.status}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {active.status === "resolved" ? (
            <button
              onClick={() => setStatus(active.id, "open")}
              className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-[12px] font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reopen
            </button>
          ) : (
            <>
              {active.status !== "pending" && (
                <button
                  onClick={() => setStatus(active.id, "pending")}
                  className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 text-[12px] font-medium transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Pending
                </button>
              )}
              <button
                onClick={() => setStatus(active.id, "resolved")}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white text-[12px] font-medium transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Resolve
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 scrollbar-thin bg-[#fafafa]">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-zinc-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        )}

        {(active.messages ?? []).map((msg, i) => {
          const isAgent = msg.sender === "agent" || msg.sender_type === "agent";
          return (
            <div key={msg.id || i} className={`flex ${isAgent ? "justify-end" : "justify-start"} items-end gap-2`}>
              {!isAgent && (
                <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-zinc-600">{initials(active.visitorName)}</span>
                </div>
              )}
              <div className="max-w-[65%]">
                <div className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${
                  isAgent
                    ? "bg-indigo-500 text-white rounded-br-sm"
                    : "bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm"
                }`}>
                  {msg.text}
                </div>
                <p className={`text-[10.5px] text-zinc-400 mt-1 ${isAgent ? "text-right" : "text-left"}`}>
                  {formatTime(msg.timestamp ?? msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Resolved notice */}
      {isResolved && (
        <div className="px-5 py-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center gap-2 shrink-0">
          <CheckCircle className="w-3.5 h-3.5 text-zinc-400" />
          <p className="text-[12.5px] text-zinc-500">This conversation has been resolved.</p>
          <button
            onClick={() => setStatus(active.id, "open")}
            className="ml-auto text-[12px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            Reopen
          </button>
        </div>
      )}

      {/* Input */}
      {!isResolved && (
        <div className="px-4 py-3 border-t border-zinc-100 bg-white shrink-0">
          <div className="flex items-end gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Reply to ${active.visitorName || "visitor"}…`}
              rows={1}
              className="flex-1 bg-transparent text-[13.5px] text-zinc-900 placeholder:text-zinc-400 outline-none resize-none max-h-[120px] py-0.5 scrollbar-thin"
              style={{ minHeight: "22px" }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim()}
              className="w-8 h-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-200 flex items-center justify-center shrink-0 transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1.5 px-1">↵ Send · ⇧↵ New line</p>
        </div>
      )}
    </div>
  );
}
