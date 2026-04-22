"use client";

import { useEffect, useState } from "react";
import { Search, MessageSquare, Mail, Phone } from "lucide-react";
import useInboxStore from "@/store/inboxStore";
import SlaCountdown from "./SlaCountdown";

const TABS = ["all", "open", "pending", "snoozed", "resolved"];
const CHANNEL_FILTERS = [
  { id: "all",      label: "All",      icon: null },
  { id: "chat",     label: "Chat",     icon: MessageSquare },
  { id: "email",    label: "Email",    icon: Mail },
  { id: "whatsapp", label: "WhatsApp", icon: Phone },
];
const CHANNEL_ICON = { chat: MessageSquare, email: Mail, whatsapp: Phone };

const STATUS_DOT = {
  open: "bg-emerald-400",
  pending: "bg-amber-400",
  snoozed: "bg-amber-300",
  resolved: "bg-zinc-300",
};

function formatTime(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function initials(name) {
  return (name || "V").charAt(0).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

export default function ChatList() {
  const conversations = useInboxStore((s) => s.conversations);
  const activeId = useInboxStore((s) => s.activeConversationId);
  const setActive = useInboxStore((s) => s.setActiveConversation);
  const loadMessages = useInboxStore((s) => s.loadMessages);
  const init = useInboxStore((s) => s.init);

  const [tab, setTab] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = document.cookie.match(/access_token=([^;]+)/)?.[1];
    if (token) init(token);
  }, [init]);

  function handleSelect(id) {
    setActive(id);
    loadMessages(id);
  }

  const counts = {
    all: conversations.filter((c) => c.status !== "merged").length,
    open: conversations.filter((c) => c.status === "open").length,
    pending: conversations.filter((c) => c.status === "pending").length,
    snoozed: conversations.filter((c) => c.status === "snoozed").length,
    resolved: conversations.filter((c) => c.status === "resolved").length,
  };

  const filtered = conversations.filter((c) => {
    if (c.status === "merged") return false;
    if (channelFilter !== "all" && (c.channel ?? "chat") !== channelFilter) return false;
    if (tab !== "all" && c.status !== tab) return false;
    if (search && !c.visitorName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <aside className="w-[288px] h-full flex flex-col shrink-0 bg-white border-r border-zinc-100">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-zinc-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-zinc-900">Inbox</h2>
          <span className="text-[11px] text-zinc-400 font-medium">{conversations.length} total</span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full h-8 pl-8 pr-3 text-[12.5px] placeholder:text-zinc-400 text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 px-3 py-2.5 border-b border-zinc-100">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium capitalize transition-colors ${
              tab === t
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {t}
            <span className={`text-[10.5px] ${tab === t ? "text-zinc-500" : "text-zinc-400"}`}>
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* Channel filter */}
      <div className="flex gap-1 px-3 py-2 border-b border-zinc-100 overflow-x-auto scrollbar-thin">
        {CHANNEL_FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setChannelFilter(id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
              channelFilter === id
                ? "bg-indigo-50 text-indigo-700"
                : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-[13px] font-medium text-zinc-600 mb-1">No conversations</p>
            <p className="text-[12px] text-zinc-400">
              {search ? "Try a different search." : "New chats will appear here."}
            </p>
          </div>
        ) : (
          filtered.map((c) => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-50 transition-colors ${
                  active ? "bg-indigo-50" : "hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-semibold text-white ${avatarColor(c.visitorName)}`}>
                    {initials(c.visitorName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[13px] font-medium truncate flex items-center gap-1.5 ${active ? "text-indigo-700" : "text-zinc-900"}`}>
                        {(() => {
                          const Icon = CHANNEL_ICON[c.channel ?? "chat"] ?? MessageSquare;
                          return <Icon className="w-3 h-3 text-zinc-400 shrink-0" />;
                        })()}
                        <span className="truncate">{c.visitorName || "Visitor"}</span>
                      </span>
                      <span className="text-[11px] text-zinc-400 shrink-0 ml-2">
                        {formatTime(c.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] text-zinc-400 truncate">
                        {c.lastMessage || "No messages yet"}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.unread > 0 && (
                          <span className="min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-semibold flex items-center justify-center">
                            {c.unread > 9 ? "9+" : c.unread}
                          </span>
                        )}
                        <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status] || "bg-zinc-300"}`} />
                      </div>
                    </div>
                    {/* tags + SLA + assignee strip */}
                    {((c.tags ?? []).length > 0 || c.assignedAgent || c.status === "open" || c.status === "pending") && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {(c.tags ?? []).slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[10px] font-medium"
                            style={{
                              color: t.color,
                              background: t.color + "15",
                            }}
                          >
                            <span className="w-1 h-1 rounded-full" style={{ background: t.color }} />
                            {t.name}
                          </span>
                        ))}
                        {(c.tags ?? []).length > 3 && (
                          <span className="text-[10px] text-zinc-400">+{c.tags.length - 3}</span>
                        )}
                        <SlaCountdown conversation={c} />
                        {c.assignedAgent && (
                          <span
                            className="ml-auto w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[8.5px] font-semibold flex items-center justify-center"
                            title={`Assigned to ${c.assignedAgent.full_name}`}
                          >
                            {initials(c.assignedAgent.full_name)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
