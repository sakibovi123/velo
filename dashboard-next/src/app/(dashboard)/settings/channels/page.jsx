"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, Plus, Trash2, Copy, Check, RefreshCw } from "lucide-react";
import useInboxStore from "@/store/inboxStore";

const CHANNEL_OPTIONS = [
  { id: "email",    label: "Email",    icon: Mail,  providers: [{ id: "sendgrid",        label: "SendGrid Inbound Parse" }] },
  { id: "whatsapp", label: "WhatsApp", icon: Phone, providers: [{ id: "twilio_whatsapp", label: "Twilio WhatsApp" }] },
];

const FIELDS_BY_PROVIDER = {
  sendgrid:        ["from_email"],
  twilio_whatsapp: ["account_sid", "auth_token"],
};

const FIELD_LABEL = {
  from_email:  "Default From email",
  account_sid: "Twilio Account SID",
  auth_token:  "Twilio Auth Token",
};

function randomSecret() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildWebhookUrl(account) {
  if (typeof window === "undefined") return account.inbound_webhook_path || "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  // The webhook lives at the bare host (no /api/v1), so strip /api/v1 if present.
  const host = apiBase.replace(/\/api\/v1\/?$/, "");
  return `${host}${account.inbound_webhook_path || ""}`;
}

export default function ChannelsPage() {
  const me = useInboxStore((s) => s.me);
  const loadMe = useInboxStore((s) => s.loadMe);
  const loadChannelAccounts = useInboxStore((s) => s.loadChannelAccounts);
  const createChannelAccount = useInboxStore((s) => s.createChannelAccount);
  const updateChannelAccount = useInboxStore((s) => s.updateChannelAccount);
  const deleteChannelAccount = useInboxStore((s) => s.deleteChannelAccount);

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (!me) loadMe();
  }, [me, loadMe]);

  async function refresh() {
    setLoading(true);
    const list = await loadChannelAccounts();
    setAccounts(list ?? []);
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const isAdmin = me?.role === "admin";

  if (me && !isAdmin) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Channels</h1>
        <p className="text-zinc-500">Only workspace admins can manage channels.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Channels</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white text-[13px] font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Add channel
        </button>
      </div>
      <p className="text-[13px] text-zinc-500 mb-6">
        Connect an email address or WhatsApp number so its inbound messages land in the agent inbox.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-[13px] text-rose-700">
          {error}
        </div>
      )}

      {showForm && (
        <NewAccountForm
          onCancel={() => setShowForm(false)}
          onCreate={async (payload) => {
            try {
              setError("");
              await createChannelAccount(payload);
              setShowForm(false);
              await refresh();
            } catch (err) {
              setError(err?.response?.data?.error?.message ?? "Failed to create channel account.");
            }
          }}
        />
      )}

      <div className="space-y-3">
        {loading && <p className="text-[13px] text-zinc-400">Loading…</p>}
        {!loading && accounts.length === 0 && !showForm && (
          <div className="px-6 py-12 rounded-xl border border-dashed border-zinc-200 text-center">
            <p className="text-[14px] font-medium text-zinc-700">No channels yet</p>
            <p className="text-[13px] text-zinc-400 mt-1">Add an email address or WhatsApp number to get started.</p>
          </div>
        )}
        {accounts.map((acct) => {
          const Icon = CHANNEL_OPTIONS.find((c) => c.id === acct.channel)?.icon ?? Mail;
          const webhookUrl = buildWebhookUrl(acct);
          return (
            <div key={acct.id} className="border border-zinc-200 rounded-xl p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-zinc-900">
                      {acct.display_name || acct.inbound_address}
                    </p>
                    <p className="text-[12px] text-zinc-400">
                      {acct.channel.toUpperCase()} · {acct.provider} · {acct.is_active ? "Active" : "Disabled"}
                    </p>
                    <p className="text-[12px] text-zinc-500 mt-1 truncate">{acct.inbound_address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={async () => {
                      await updateChannelAccount(acct.id, { is_active: !acct.is_active });
                      await refresh();
                    }}
                    className="px-2 h-7 rounded-md text-[11.5px] text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                  >
                    {acct.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this channel account?")) return;
                      await deleteChannelAccount(acct.id);
                      await refresh();
                    }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-rose-500 hover:bg-rose-50 border border-zinc-200"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-100">
                <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
                  Inbound webhook URL
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2.5 py-1.5 rounded-md bg-zinc-50 border border-zinc-200 text-[11.5px] text-zinc-700 break-all">
                    {webhookUrl}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      setCopiedId(acct.id);
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-100 border border-zinc-200"
                    title="Copy"
                  >
                    {copiedId === acct.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  Paste this into your provider's console
                  ({acct.channel === "email" ? "SendGrid Inbound Parse" : "Twilio WhatsApp messaging webhook"}).
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewAccountForm({ onCancel, onCreate }) {
  const [channel, setChannel]                 = useState("email");
  const [provider, setProvider]               = useState("sendgrid");
  const [displayName, setDisplayName]         = useState("");
  const [inboundAddress, setInboundAddress]   = useState("");
  const [config, setConfig]                   = useState({});
  const [secret, setSecret]                   = useState(randomSecret());
  const [submitting, setSubmitting]           = useState(false);

  const channelOpt = useMemo(() => CHANNEL_OPTIONS.find((c) => c.id === channel), [channel]);
  const fields = FIELDS_BY_PROVIDER[provider] ?? [];

  function setChannelAndDefault(next) {
    setChannel(next);
    const opt = CHANNEL_OPTIONS.find((c) => c.id === next);
    setProvider(opt?.providers[0]?.id ?? "");
    setConfig({});
  }

  async function submit(e) {
    e.preventDefault();
    if (!inboundAddress.trim()) return;
    setSubmitting(true);
    try {
      await onCreate({
        channel,
        provider,
        display_name: displayName,
        inbound_address: inboundAddress.trim(),
        config,
        webhook_secret: secret,
        is_active: true,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 border border-zinc-200 rounded-xl p-4 bg-white space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannelAndDefault(e.target.value)}
            className="mt-1 w-full h-9 px-2 rounded-md border border-zinc-200 text-[13px]"
          >
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 w-full h-9 px-2 rounded-md border border-zinc-200 text-[13px]"
          >
            {channelOpt?.providers.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          Inbound address {channel === "whatsapp" ? "(E.164 phone number, e.g. +15551234567)" : "(email address)"}
        </label>
        <input
          value={inboundAddress}
          onChange={(e) => setInboundAddress(e.target.value)}
          placeholder={channel === "email" ? "support@yourcompany.com" : "+15551234567"}
          className="mt-1 w-full h-9 px-2 rounded-md border border-zinc-200 text-[13px]"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Display name (optional)</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Support · EU"
          className="mt-1 w-full h-9 px-2 rounded-md border border-zinc-200 text-[13px]"
        />
      </div>

      {fields.map((f) => (
        <div key={f}>
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">{FIELD_LABEL[f] || f}</label>
          <input
            value={config[f] ?? ""}
            onChange={(e) => setConfig({ ...config, [f]: e.target.value })}
            type={f === "auth_token" ? "password" : "text"}
            className="mt-1 w-full h-9 px-2 rounded-md border border-zinc-200 text-[13px]"
          />
        </div>
      ))}

      <div>
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Webhook secret</label>
        <div className="mt-1 flex gap-2">
          <input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="flex-1 h-9 px-2 rounded-md border border-zinc-200 text-[12px] font-mono"
          />
          <button
            type="button"
            onClick={() => setSecret(randomSecret())}
            className="w-9 h-9 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-100 border border-zinc-200"
            title="Regenerate"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 h-8 rounded-lg border border-zinc-200 text-[13px] text-zinc-600 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white text-[13px] font-medium disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Create"}
        </button>
      </div>
    </form>
  );
}
