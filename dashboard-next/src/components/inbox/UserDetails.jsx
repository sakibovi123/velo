"use client";

import useInboxStore from "@/store/inboxStore";

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5 break-words">{value}</dd>
    </div>
  );
}

export default function UserDetails() {
  const conversations = useInboxStore((s) => s.conversations);
  const activeId = useInboxStore((s) => s.activeConversationId);
  const active = conversations.find((c) => c.id === activeId) ?? null;

  if (!active) {
    return (
      <aside className="w-72 shrink-0 h-full border-l border-gray-200 bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">No conversation selected</p>
      </aside>
    );
  }

  const { visitorName, visitorEmail, visitorMeta = {} } = active;

  return (
    <aside className="w-72 shrink-0 h-full border-l border-gray-200 bg-white overflow-y-auto">
      {/* Avatar + name */}
      <div className="flex flex-col items-center py-6 px-4 border-b border-gray-100">
        <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 text-xl font-bold flex items-center justify-center mb-3">
          {visitorName?.[0]?.toUpperCase() ?? "?"}
        </div>
        <p className="font-semibold text-gray-900 text-sm">{visitorName}</p>
        {visitorEmail && <p className="text-xs text-gray-500 mt-0.5">{visitorEmail}</p>}
      </div>

      {/* Details list */}
      <dl className="px-4 py-4 space-y-4">
        <DetailRow label="Location" value={visitorMeta.location} />
        <DetailRow label="Browser" value={visitorMeta.browser} />
        <DetailRow label="OS" value={visitorMeta.os} />
        <DetailRow label="Page URL" value={visitorMeta.pageUrl} />
        <DetailRow label="Referrer" value={visitorMeta.referrer} />
        <DetailRow label="First seen" value={visitorMeta.firstSeen ? new Date(visitorMeta.firstSeen).toLocaleDateString() : null} />
      </dl>

      {/* Previous conversations count */}
      {visitorMeta.previousConversations != null && (
        <div className="mx-4 mt-2 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-500">
          {visitorMeta.previousConversations} previous conversation{visitorMeta.previousConversations !== 1 ? "s" : ""}
        </div>
      )}
    </aside>
  );
}
