"use client";

import { useEffect, useState } from "react";
import { Timer, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Live SLA countdown badge for a conversation.
 *
 * - If `firstReplyAt` is null: counts down to (created_at + slaFirstReplyMinutes).
 *   Once breached, shows red "First reply overdue".
 * - If `firstReplyAt` is set: counts down to (created_at + slaResolutionMinutes).
 *   Once breached, shows red "Resolution overdue".
 * - If conversation is resolved/snoozed/merged: nothing.
 */
function fmt(ms) {
  if (ms <= 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

export default function SlaCountdown({ conversation }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  if (!conversation || ["resolved", "merged", "snoozed"].includes(conversation.status)) {
    return null;
  }

  const created = conversation.created_at
    ? new Date(conversation.created_at).getTime()
    : conversation.updatedAt;
  if (!created) return null;

  const phase = conversation.firstReplyAt ? "resolution" : "firstReply";
  const limitMin =
    phase === "firstReply"
      ? conversation.slaFirstReplyMinutes
      : conversation.slaResolutionMinutes;
  const deadline = created + limitMin * 60 * 1000;
  const remaining = deadline - now;
  const breached = remaining <= 0;

  const label = phase === "firstReply" ? "First reply" : "Resolution";

  if (breached) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-rose-50 border border-rose-200 text-rose-600 text-[10.5px] font-semibold" title={`${label} SLA overdue`}>
        <AlertTriangle className="w-3 h-3" />
        Overdue
      </span>
    );
  }

  // ok if more than 25% of the window remaining, warn otherwise
  const warn = remaining < limitMin * 60 * 1000 * 0.25;
  const cls = warn
    ? "bg-amber-50 border-amber-200 text-amber-600"
    : "bg-zinc-50 border-zinc-200 text-zinc-500";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-md border text-[10.5px] font-medium ${cls}`}
      title={`${label} SLA: ${fmt(remaining)} remaining`}
    >
      <Timer className="w-3 h-3" />
      {fmt(remaining)}
    </span>
  );
}

export function SlaSummary({ conversation }) {
  if (!conversation) return null;
  if (conversation.firstReplyAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
        <CheckCircle2 className="w-3 h-3" />
        First reply met
      </span>
    );
  }
  return null;
}
