"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, UserMinus, Check } from "lucide-react";
import useInboxStore from "@/store/inboxStore";

function initials(name) {
  return (name || "?").charAt(0).toUpperCase();
}

const PRESENCE_DOT = {
  online: "bg-emerald-500",
  away: "bg-amber-400",
  offline: "bg-zinc-300",
};

/**
 * Header dropdown that lets the current agent reassign or unassign the
 * active conversation. Calls POST /conversations/{id}/assign/.
 */
export default function AssigneePicker({ conversation }) {
  const agents = useInboxStore((s) => s.agents);
  const loadAgents = useInboxStore((s) => s.loadAgents);
  const assignConversation = useInboxStore((s) => s.assignConversation);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open && agents.length === 0) loadAgents();
  }, [open, agents.length, loadAgents]);

  async function pick(agentId) {
    if (busy) return;
    setBusy(true);
    try {
      await assignConversation(conversation.id, agentId);
      setOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const current = conversation.assignedAgent;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 h-7 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-[12px] font-medium text-zinc-700 transition-colors"
        title="Assign conversation"
      >
        {current ? (
          <>
            <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-semibold flex items-center justify-center">
              {initials(current.full_name)}
            </span>
            <span className="truncate max-w-[100px]">{current.full_name}</span>
          </>
        ) : (
          <span className="text-zinc-500">Unassigned</span>
        )}
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-64 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 py-1 max-h-72 overflow-y-auto scrollbar-thin">
          <button
            onClick={() => pick(null)}
            className="w-full px-3 py-2 flex items-center gap-2 text-[12.5px] text-zinc-600 hover:bg-zinc-50 text-left"
          >
            <UserMinus className="w-3.5 h-3.5 text-zinc-400" />
            Unassign
            {!current && <Check className="w-3.5 h-3.5 ml-auto text-indigo-500" />}
          </button>
          <div className="my-1 border-t border-zinc-100" />
          {agents.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-zinc-400">Loading…</p>
          ) : (
            agents.map((a) => {
              const selected = current?.id === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => pick(a.id)}
                  className="w-full px-3 py-2 flex items-center gap-2 text-[12.5px] text-zinc-700 hover:bg-zinc-50 text-left"
                >
                  <span className="relative shrink-0">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-semibold flex items-center justify-center">
                      {initials(a.full_name)}
                    </span>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white ${PRESENCE_DOT[a.presence_status] || "bg-zinc-300"}`} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{a.full_name}</span>
                    <span className="block text-[10.5px] text-zinc-400 truncate">{a.email}</span>
                  </span>
                  {selected && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
