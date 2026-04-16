"use client";

import { useEffect } from "react";
import useInboxStore from "@/store/inboxStore";

const STATUS_BADGE = {
  open: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  resolved: "bg-gray-100 text-gray-500",
};

export default function ChatList() {
  const conversations = useInboxStore((s) => s.conversations);
  const activeId = useInboxStore((s) => s.activeConversationId);
  const setActive = useInboxStore((s) => s.setActiveConversation);
  const loadMessages = useInboxStore((s) => s.loadMessages);
  const init = useInboxStore((s) => s.init);

  // Boot socket connection on mount using the stored JWT cookie
  useEffect(() => {
    const token = document.cookie.match(/access_token=([^;]+)/)?.[1];
    if (token) init(token);
  }, [init]);

  function handleSelect(id) {
    setActive(id);
    loadMessages(id);
  }

  return (
    <aside className="w-72 shrink-0 flex flex-col h-full border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Inbox</h2>
        <p className="text-xs text-gray-500 mt-0.5">{conversations.length} conversations</p>
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {conversations.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-gray-400">No conversations yet.</li>
        )}
        {conversations.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => handleSelect(c.id)}
              className={[
                "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors",
                activeId === c.id ? "bg-indigo-50 border-l-2 border-indigo-600" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 truncate">{c.visitorName}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_BADGE[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">{c.lastMessage}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-400">
                  {c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
                {c.unread > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {c.unread}
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
