"use client";

import { useState } from "react";
import { GitMerge, X, Search } from "lucide-react";
import useInboxStore from "@/store/inboxStore";

function initials(name) {
  return (name || "V").charAt(0).toUpperCase();
}

export default function MergeModal({ targetConversation, onClose }) {
  const all = useInboxStore((s) => s.conversations);
  const merge = useInboxStore((s) => s.mergeConversations);
  const [picked, setPicked] = useState(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const candidates = all
    .filter((c) => c.id !== targetConversation.id && c.status !== "merged")
    .filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.visitorName?.toLowerCase().includes(q) ||
        c.visitorEmail?.toLowerCase().includes(q)
      );
    });

  async function handleMerge() {
    if (!picked || busy) return;
    setBusy(true);
    try {
      await merge(targetConversation.id, picked.id);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-[460px] max-w-full bg-white rounded-xl shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-indigo-500" />
            <h3 className="text-[14px] font-semibold text-zinc-900">Merge conversation</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-md">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-zinc-100 shrink-0">
          <p className="text-[12.5px] text-zinc-500 mb-2">
            Pick a conversation to merge <span className="font-medium text-zinc-700">into</span>{" "}
            <span className="font-medium text-zinc-900">{targetConversation.visitorName}</span>.
            All messages will move here. The source will be marked as merged.
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full h-8 pl-8 pr-3 text-[12.5px] bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {candidates.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12.5px] text-zinc-400">
              No other conversations to merge.
            </p>
          ) : (
            candidates.map((c) => {
              const sel = picked?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setPicked(c)}
                  className={`w-full px-5 py-3 flex items-center gap-3 border-b border-zinc-50 text-left transition-colors ${
                    sel ? "bg-indigo-50" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-[12px] font-semibold flex items-center justify-center">
                    {initials(c.visitorName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-zinc-900 truncate">
                      {c.visitorName || "Visitor"}
                    </p>
                    <p className="text-[11.5px] text-zinc-400 truncate">
                      {c.lastMessage || "No messages yet"}
                    </p>
                  </div>
                  <span className="text-[10.5px] uppercase tracking-wide text-zinc-400">
                    {c.status}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-100 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="h-8 px-3 text-[12.5px] font-medium text-zinc-600 hover:bg-zinc-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={!picked || busy}
            className="h-8 px-3 text-[12.5px] font-medium bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {busy ? "Merging…" : "Merge"}
          </button>
        </div>
      </div>
    </div>
  );
}
