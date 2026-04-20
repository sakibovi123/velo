"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, ChevronDown } from "lucide-react";
import useInboxStore from "@/store/inboxStore";

const PRESETS = [
  { label: "1 hour",     ms: 60 * 60 * 1000 },
  { label: "3 hours",    ms: 3 * 60 * 60 * 1000 },
  { label: "Tomorrow 9am", at: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  } },
  { label: "Next week",  ms: 7 * 24 * 60 * 60 * 1000 },
];

export default function SnoozePicker({ conversation }) {
  const snooze = useInboxStore((s) => s.snoozeConversation);
  const unsnooze = useInboxStore((s) => s.unsnoozeConversation);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const isSnoozed = conversation.status === "snoozed";

  async function pick(preset) {
    const date = preset.at ? preset.at() : new Date(Date.now() + preset.ms);
    try {
      await snooze(conversation.id, date.toISOString());
      setOpen(false);
    } catch (e) {
      console.error(e);
    }
  }

  if (isSnoozed) {
    const until = conversation.snoozedUntil
      ? new Date(conversation.snoozedUntil).toLocaleString("en", {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        })
      : "—";
    return (
      <button
        onClick={() => unsnooze(conversation.id)}
        className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[12px] font-medium transition-colors"
        title={`Snoozed until ${until}`}
      >
        <Clock className="w-3.5 h-3.5" />
        Snoozed · Wake
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 text-[12px] font-medium transition-colors"
      >
        <Clock className="w-3.5 h-3.5" />
        Snooze
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-44 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 py-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => pick(p)}
              className="w-full px-3 py-1.5 text-[12.5px] text-zinc-700 hover:bg-zinc-50 text-left"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
