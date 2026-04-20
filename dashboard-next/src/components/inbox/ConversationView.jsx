"use client";

import { useState, useEffect, useRef } from "react";
import { Send, CheckCircle, Clock, RotateCcw, MessageSquare, MoreHorizontal, GitMerge, StickyNote, Languages, Eye, EyeOff } from "lucide-react";
import useInboxStore from "@/store/inboxStore";
import AssigneePicker from "./AssigneePicker";
import SnoozePicker from "./SnoozePicker";
import TagPicker from "./TagPicker";
import MergeModal from "./MergeModal";
import SlaCountdown from "./SlaCountdown";

const STATUS_PILL = {
  open: "text-emerald-600 bg-emerald-50 border-emerald-200",
  pending: "text-amber-600 bg-amber-50 border-amber-200",
  snoozed: "text-amber-600 bg-amber-50 border-amber-200",
  resolved: "text-zinc-500 bg-zinc-100 border-zinc-200",
  merged: "text-zinc-500 bg-zinc-100 border-zinc-200",
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
  const addInternalNote = useInboxStore((s) => s.addInternalNote);
  const setStatus = useInboxStore((s) => s.setConversationStatus);
  const isLoading = useInboxStore((s) => s.isLoading);
  const me = useInboxStore((s) => s.me);
  const showOriginal = useInboxStore((s) => s.showOriginal);
  const toggleShowOriginal = useInboxStore((s) => s.toggleShowOriginal);
  const autoTranslateReply = useInboxStore((s) => s.autoTranslateReply);
  const setAutoTranslateReply = useInboxStore((s) => s.setAutoTranslateReply);
  const translateReplyDraft = useInboxStore((s) => s.translateReplyDraft);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("reply"); // "reply" | "note"
  const [moreOpen, setMoreOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [translatingDraft, setTranslatingDraft] = useState(false);
  const moreRef = useRef(null);
  const bottomRef = useRef(null);

  const myLang = (me?.preferred_language || "en").toLowerCase();
  // Detect visitor language from the most recent visitor message
  const visitorLang = (() => {
    if (!active) return "";
    const msgs = active.messages ?? [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if ((m.sender === "visitor" || m.sender_type === "visitor") && m.original_language) {
        return m.original_language.toLowerCase();
      }
    }
    return "";
  })();
  const needsTranslation = !!visitorLang && visitorLang !== myLang;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages?.length]);

  useEffect(() => {
    function onClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    }
    if (moreOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

  async function handleSend(e) {
    e?.preventDefault();
    if (!draft.trim() || active?.status === "resolved" || active?.status === "merged") return;
    if (mode === "note") {
      addInternalNote(active.id, draft).catch(console.error);
      setDraft("");
      return;
    }
    let text = draft;
    if (autoTranslateReply && needsTranslation) {
      setTranslatingDraft(true);
      try {
        const translated = await translateReplyDraft(active.id, draft, visitorLang);
        if (translated) text = translated;
      } finally {
        setTranslatingDraft(false);
      }
    }
    sendMessage(text);
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
  const isLocked = isResolved || active.status === "merged";
  const isNote = mode === "note";

  return (
    <div className="flex-1 h-full flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 flex flex-col gap-2 border-b border-zinc-100 shrink-0">
        <div className="flex items-center justify-between gap-3">
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
            <SlaCountdown conversation={active} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!isLocked && <AssigneePicker conversation={active} />}
            {!isLocked && <SnoozePicker conversation={active} />}

            {isResolved ? (
              <button
                onClick={() => setStatus(active.id, "open")}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-[12px] font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reopen
              </button>
            ) : !isLocked && (
              <>
                {active.status !== "pending" && active.status !== "snoozed" && (
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

            {!isLocked && (
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  className="w-7 h-7 rounded-lg border border-zinc-200 hover:bg-zinc-50 flex items-center justify-center text-zinc-500"
                  title="More actions"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 top-9 w-44 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={() => { setMoreOpen(false); setMergeOpen(true); }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-[12.5px] text-zinc-700 hover:bg-zinc-50 text-left"
                    >
                      <GitMerge className="w-3.5 h-3.5 text-zinc-400" />
                      Merge into this…
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap pl-11">
          {(active.tags ?? []).map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 px-2 h-5 rounded-md text-[10.5px] font-medium border"
              style={{
                color: t.color,
                borderColor: t.color + "55",
                background: t.color + "10",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
              {t.name}
            </span>
          ))}
          {!isLocked && <TagPicker conversation={active} />}
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
          const isSystem = msg.sender_type === "bot";
          const isInternal = msg.is_internal;
          const isAgent = msg.sender === "agent" || msg.sender_type === "agent";

          if (isSystem && isInternal) {
            return (
              <div key={msg.id || i} className="flex justify-center">
                <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-500 text-[11px]">
                  {msg.text}
                </span>
              </div>
            );
          }

          if (isInternal) {
            return (
              <div key={msg.id || i} className="flex justify-end items-end gap-2">
                <div className="max-w-[70%]">
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-br-sm text-[13.5px] leading-relaxed bg-amber-50 border border-amber-200 text-amber-900">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-600 mb-1">
                      <StickyNote className="w-3 h-3" />
                      Internal note · {msg.sender_name}
                    </div>
                    {msg.text}
                  </div>
                  <p className="text-[10.5px] text-zinc-400 mt-1 text-right">
                    {formatTime(msg.timestamp ?? msg.created_at)}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id || i} className={`flex ${isAgent ? "justify-end" : "justify-start"} items-end gap-2`}>
              {!isAgent && (
                <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-zinc-600">{initials(active.visitorName)}</span>
                </div>
              )}
              <div className="max-w-[65%]">
                {(() => {
                  const translations = msg.translations || {};
                  const originalLang = (msg.original_language || "").toLowerCase();
                  const translatedForMe = translations[myLang];
                  const hasTranslation =
                    !!translatedForMe &&
                    !!originalLang &&
                    originalLang !== myLang &&
                    translatedForMe !== msg.text;
                  const showingOriginal = !!showOriginal[msg.id];
                  const display =
                    hasTranslation && !showingOriginal ? translatedForMe : msg.text;
                  return (
                    <>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${
                        isAgent
                          ? "bg-indigo-500 text-white rounded-br-sm"
                          : "bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm"
                      }`}>
                        {display}
                      </div>
                      {hasTranslation && (
                        <button
                          onClick={() => toggleShowOriginal(msg.id)}
                          className={`mt-1 inline-flex items-center gap-1 text-[10.5px] hover:underline ${
                            isAgent ? "text-indigo-400" : "text-zinc-400"
                          } ${isAgent ? "ml-auto" : ""}`}
                        >
                          {showingOriginal ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              Show translation ({myLang})
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              Show original ({originalLang})
                            </>
                          )}
                        </button>
                      )}
                      <p className={`text-[10.5px] text-zinc-400 mt-1 ${isAgent ? "text-right" : "text-left"}`}>
                        {formatTime(msg.timestamp ?? msg.created_at)}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Locked notice */}
      {isLocked && (
        <div className="px-5 py-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center gap-2 shrink-0">
          <CheckCircle className="w-3.5 h-3.5 text-zinc-400" />
          <p className="text-[12.5px] text-zinc-500">
            {active.status === "merged"
              ? "This conversation has been merged into another."
              : "This conversation has been resolved."}
          </p>
          {isResolved && (
            <button
              onClick={() => setStatus(active.id, "open")}
              className="ml-auto text-[12px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Reopen
            </button>
          )}
        </div>
      )}

      {/* Input */}
      {!isLocked && (
        <div className="px-4 py-3 border-t border-zinc-100 bg-white shrink-0">
          <div className="flex gap-1 mb-2 items-center">
            <button
              onClick={() => setMode("reply")}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors ${
                mode === "reply" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              Reply
            </button>
            <button
              onClick={() => setMode("note")}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors flex items-center gap-1 ${
                mode === "note" ? "bg-amber-100 text-amber-800" : "text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              <StickyNote className="w-3 h-3" />
              Internal note
            </button>

            {mode === "reply" && needsTranslation && (
              <div className="ml-auto flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500">
                  <Languages className="w-3 h-3 text-indigo-500" />
                  Visitor: <span className="font-medium uppercase">{visitorLang}</span>
                  <span className="text-zinc-300">→</span>
                  You: <span className="font-medium uppercase">{myLang}</span>
                </span>
                <label className="inline-flex items-center gap-1 text-[10.5px] text-zinc-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoTranslateReply}
                    onChange={(e) => setAutoTranslateReply(e.target.checked)}
                    className="w-3 h-3 accent-indigo-500"
                  />
                  Auto-translate reply
                </label>
              </div>
            )}
          </div>
          <div className={`flex items-end gap-2 border rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:border-transparent ${
            isNote
              ? "bg-amber-50 border-amber-200 focus-within:ring-amber-500"
              : "bg-zinc-50 border-zinc-200 focus-within:ring-indigo-500"
          }`}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isNote
                  ? "Internal note — only visible to teammates"
                  : `Reply to ${active.visitorName || "visitor"}…`
              }
              rows={1}
              className="flex-1 bg-transparent text-[13.5px] text-zinc-900 placeholder:text-zinc-400 outline-none resize-none max-h-[120px] py-0.5 scrollbar-thin"
              style={{ minHeight: "22px" }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || translatingDraft}
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:bg-zinc-200 ${
                isNote
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-indigo-500 hover:bg-indigo-600"
              }`}
            >
              {translatingDraft ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1.5 px-1">
            ↵ Send · ⇧↵ New line
            {mode === "reply" && needsTranslation && autoTranslateReply && (
              <span className="ml-2 text-indigo-500">
                · Will be translated to {visitorLang.toUpperCase()} before send
              </span>
            )}
          </p>
        </div>
      )}

      {mergeOpen && (
        <MergeModal targetConversation={active} onClose={() => setMergeOpen(false)} />
      )}
    </div>
  );
}
