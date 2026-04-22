"use client";

import { Globe, Monitor, Link2, ExternalLink, Calendar, MessageSquare, User, Mail, Phone, Hash } from "lucide-react";
import useInboxStore from "@/store/inboxStore";

const CHANNEL_LABEL = { chat: "Live chat", email: "Email", whatsapp: "WhatsApp" };
const CHANNEL_ICON = { chat: MessageSquare, email: Mail, whatsapp: Phone };

function Section({ title, children }) {
  return (
    <div className="px-4 py-4 border-b border-zinc-100">
      <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-zinc-400 mb-0.5">{label}</p>
        <p className="text-[12.5px] text-zinc-700 break-all leading-snug">{value}</p>
      </div>
    </div>
  );
}

function initials(name) {
  return (name || "V").charAt(0).toUpperCase();
}

export default function UserDetails() {
  const conversations = useInboxStore((s) => s.conversations);
  const activeId = useInboxStore((s) => s.activeConversationId);
  const active = conversations.find((c) => c.id === activeId) ?? null;

  if (!active) {
    return (
      <aside className="w-[256px] h-full bg-white border-l border-zinc-100 flex flex-col items-center justify-center shrink-0">
        <User className="w-7 h-7 text-zinc-300 mb-2" />
        <p className="text-[12.5px] text-zinc-400 text-center px-6">
          Select a conversation to view visitor details
        </p>
      </aside>
    );
  }

  const { visitorName, visitorEmail, visitorPhone, channel, subject, visitorMeta: m = {} } = active;
  const ChannelIcon = CHANNEL_ICON[channel ?? "chat"] ?? MessageSquare;

  return (
    <aside className="w-[256px] h-full flex flex-col bg-white border-l border-zinc-100 overflow-y-auto scrollbar-thin shrink-0">
      {/* Visitor identity */}
      <div className="px-4 pt-5 pb-4 border-b border-zinc-100">
        <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Visitor</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-[15px] font-semibold text-indigo-600">{initials(visitorName)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-zinc-900 truncate">{visitorName || "Visitor"}</p>
            {visitorEmail && (
              <p className="text-[11.5px] text-zinc-400 truncate">{visitorEmail}</p>
            )}
            {visitorPhone && (
              <p className="text-[11.5px] text-zinc-400 truncate">{visitorPhone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Channel */}
      <Section title="Channel">
        <Field icon={ChannelIcon} label="Source" value={CHANNEL_LABEL[channel ?? "chat"]} />
        {channel === "email" && subject && (
          <Field icon={Hash} label="Subject" value={subject} />
        )}
      </Section>

      {/* Session info */}
      {(m.location || m.browser || m.os) && (
        <Section title="Session">
          <Field icon={Globe} label="Location" value={m.location} />
          <Field icon={Monitor} label="Browser" value={m.browser} />
          <Field icon={Monitor} label="OS" value={m.os} />
        </Section>
      )}

      {/* Page */}
      {(m.pageUrl || m.referrer) && (
        <Section title="Page">
          <Field icon={Link2} label="Current URL" value={m.pageUrl} />
          <Field icon={ExternalLink} label="Referrer" value={m.referrer} />
        </Section>
      )}

      {/* History */}
      {(m.firstSeen || m.previousConversations != null) && (
        <Section title="History">
          {m.firstSeen && (
            <Field
              icon={Calendar}
              label="First seen"
              value={new Date(m.firstSeen).toLocaleDateString("en", {
                month: "short", day: "numeric", year: "numeric",
              })}
            />
          )}
          {m.previousConversations != null && (
            <Field
              icon={MessageSquare}
              label="Previous chats"
              value={String(m.previousConversations)}
            />
          )}
        </Section>
      )}

      {/* Conversation ID */}
      <div className="px-4 py-4 mt-auto">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Conversation ID</p>
        <p className="text-[10.5px] text-zinc-400 font-mono break-all">{active.id}</p>
      </div>
    </aside>
  );
}
