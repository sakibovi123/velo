"use client";

import { useEffect, useRef, useState } from "react";
import { Tag as TagIcon, Plus, X, Check } from "lucide-react";
import useInboxStore from "@/store/inboxStore";

const TAG_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#64748b",
];

export default function TagPicker({ conversation }) {
  const allTags = useInboxStore((s) => s.tags);
  const loadTags = useInboxStore((s) => s.loadTags);
  const createTag = useInboxStore((s) => s.createTag);
  const setTags = useInboxStore((s) => s.setConversationTags);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open && allTags.length === 0) loadTags();
  }, [open, allTags.length, loadTags]);

  const selectedIds = new Set((conversation.tags ?? []).map((t) => t.id));

  async function toggle(tagId) {
    const next = new Set(selectedIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    try {
      await setTags(conversation.id, Array.from(next));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const tag = await createTag(newName.trim(), newColor);
      await setTags(conversation.id, [...selectedIds, tag.id]);
      setNewName("");
      setCreating(false);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 h-6 rounded-md border border-dashed border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 text-[11px] text-zinc-500 transition-colors"
      >
        <TagIcon className="w-3 h-3" />
        Tag
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-60 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 py-1.5 max-h-80 overflow-y-auto scrollbar-thin">
          <p className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Tags</p>
          {allTags.length === 0 && !creating && (
            <p className="px-3 py-2 text-[12px] text-zinc-400">No tags yet.</p>
          )}
          {allTags.map((t) => {
            const sel = selectedIds.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-[12.5px] text-zinc-700 hover:bg-zinc-50 text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                <span className="flex-1 truncate">{t.name}</span>
                {sel && <Check className="w-3.5 h-3.5 text-indigo-500" />}
              </button>
            );
          })}
          <div className="my-1 border-t border-zinc-100" />
          {creating ? (
            <form onSubmit={handleCreate} className="px-3 py-2 space-y-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tag name"
                className="w-full h-7 px-2 text-[12px] border border-zinc-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-1.5">
                {TAG_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-4 h-4 rounded-full ${newColor === c ? "ring-2 ring-offset-1 ring-zinc-400" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <button type="submit" className="flex-1 h-6 text-[11px] font-medium bg-zinc-900 text-white rounded-md">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewName(""); }}
                  className="h-6 px-2 text-[11px] text-zinc-500 hover:bg-zinc-50 rounded-md"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full px-3 py-1.5 flex items-center gap-2 text-[12px] text-indigo-600 hover:bg-indigo-50 text-left"
            >
              <Plus className="w-3 h-3" />
              New tag
            </button>
          )}
        </div>
      )}
    </div>
  );
}
