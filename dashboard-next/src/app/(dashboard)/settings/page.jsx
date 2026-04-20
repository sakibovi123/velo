"use client";

import { useEffect, useState } from "react";
import { Languages, Save, Plus, X } from "lucide-react";
import useInboxStore from "@/store/inboxStore";

const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
];

function langLabel(code) {
  return LANG_OPTIONS.find((l) => l.code === code)?.label || code.toUpperCase();
}

export default function SettingsPage() {
  const me = useInboxStore((s) => s.me);
  const workspace = useInboxStore((s) => s.workspace);
  const loadMe = useInboxStore((s) => s.loadMe);
  const loadWorkspace = useInboxStore((s) => s.loadWorkspace);
  const updateMe = useInboxStore((s) => s.updateMe);
  const updateWorkspace = useInboxStore((s) => s.updateWorkspace);

  const [savingMe, setSavingMe] = useState(false);
  const [savingWs, setSavingWs] = useState(false);
  const [myLang, setMyLang] = useState("en");
  const [wsDefault, setWsDefault] = useState("en");
  const [wsLanguages, setWsLanguages] = useState([]);
  const [addingLang, setAddingLang] = useState("");
  const [meSaved, setMeSaved] = useState(false);
  const [wsSaved, setWsSaved] = useState(false);

  useEffect(() => {
    if (!me) loadMe();
    if (!workspace) loadWorkspace();
  }, [me, workspace, loadMe, loadWorkspace]);

  useEffect(() => {
    if (me?.preferred_language) setMyLang(me.preferred_language);
  }, [me?.preferred_language]);

  useEffect(() => {
    if (workspace) {
      setWsDefault(workspace.default_language || "en");
      setWsLanguages(workspace.agent_languages || []);
    }
  }, [workspace]);

  const isAdmin = me?.role === "admin";

  async function saveMe() {
    setSavingMe(true);
    setMeSaved(false);
    try {
      await updateMe({ preferred_language: myLang });
      setMeSaved(true);
      setTimeout(() => setMeSaved(false), 2000);
    } finally {
      setSavingMe(false);
    }
  }

  async function saveWorkspace() {
    setSavingWs(true);
    setWsSaved(false);
    try {
      await updateWorkspace({
        default_language: wsDefault,
        agent_languages: wsLanguages,
      });
      setWsSaved(true);
      setTimeout(() => setWsSaved(false), 2000);
    } finally {
      setSavingWs(false);
    }
  }

  function addLang() {
    const code = addingLang.trim().toLowerCase();
    if (!code || wsLanguages.includes(code)) return;
    setWsLanguages([...wsLanguages, code]);
    setAddingLang("");
  }

  function removeLang(code) {
    setWsLanguages(wsLanguages.filter((c) => c !== code));
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
        <div>
          <h1 className="text-[22px] font-semibold text-zinc-900">Settings</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Manage workspace languages and your translation preferences.
          </p>
        </div>

        {/* Personal language preference */}
        <section className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Languages className="w-4 h-4 text-indigo-500" />
            <h2 className="text-[15px] font-semibold text-zinc-900">Your language</h2>
          </div>
          <p className="text-[12.5px] text-zinc-500 mb-4">
            Incoming messages from visitors who write in another language will be
            automatically translated to this language for you.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-[11.5px] font-medium text-zinc-600 mb-1.5">
                Preferred language
              </label>
              <select
                value={myLang}
                onChange={(e) => setMyLang(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {LANG_OPTIONS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.code})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={saveMe}
              disabled={savingMe || myLang === me?.preferred_language}
              className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-medium disabled:bg-zinc-300 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              {savingMe ? "Saving…" : meSaved ? "Saved" : "Save"}
            </button>
          </div>
        </section>

        {/* Workspace language settings (admin) */}
        <section className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Languages className="w-4 h-4 text-indigo-500" />
            <h2 className="text-[15px] font-semibold text-zinc-900">
              Workspace languages
            </h2>
            {!isAdmin && (
              <span className="ml-auto text-[10.5px] text-zinc-400 px-2 py-0.5 rounded bg-zinc-100">
                Admin only
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-zinc-500 mb-4">
            The default language is the fallback all messages get translated to.
            Add every language your team handles so all incoming messages are
            pre-translated for any agent.
          </p>

          <div className="mb-5">
            <label className="block text-[11.5px] font-medium text-zinc-600 mb-1.5">
              Default workspace language
            </label>
            <select
              value={wsDefault}
              onChange={(e) => setWsDefault(e.target.value)}
              disabled={!isAdmin}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              {LANG_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.code})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-[11.5px] font-medium text-zinc-600 mb-1.5">
              Supported agent languages
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {wsLanguages.length === 0 && (
                <span className="text-[12px] text-zinc-400 italic">
                  None yet — add the languages your team replies in.
                </span>
              )}
              {wsLanguages.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[11.5px] font-medium border border-indigo-200"
                >
                  {langLabel(code)} ({code})
                  {isAdmin && (
                    <button
                      onClick={() => removeLang(code)}
                      className="ml-0.5 hover:text-indigo-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <select
                  value={addingLang}
                  onChange={(e) => setAddingLang(e.target.value)}
                  className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Add a language…</option>
                  {LANG_OPTIONS.filter((l) => !wsLanguages.includes(l.code)).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} ({l.code})
                    </option>
                  ))}
                </select>
                <button
                  onClick={addLang}
                  disabled={!addingLang}
                  className="inline-flex items-center gap-1 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-[12.5px] font-medium text-zinc-700 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2 border-t border-zinc-100">
              <button
                onClick={saveWorkspace}
                disabled={savingWs}
                className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-medium disabled:bg-zinc-300"
              >
                <Save className="w-3.5 h-3.5" />
                {savingWs ? "Saving…" : wsSaved ? "Saved" : "Save workspace"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
