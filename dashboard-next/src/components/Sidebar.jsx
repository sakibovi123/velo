"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  BarChart2,
  BookOpen,
  Sparkles,
  Tag,
  Users,
  Webhook,
  ShieldCheck,
  Settings,
  UserCircle,
  LogOut,
  Zap,
  Inbox,
} from "lucide-react";
import useInboxStore from "@/store/inboxStore";

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { label: "Inbox", href: "/inbox", icon: MessageSquare },
      { label: "Reports", href: "/reports", icon: BarChart2 },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { label: "Knowledge Base", href: "/knowledge", icon: BookOpen },
      { label: "AI Copilot", href: "/copilot", icon: Sparkles },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Agents", href: "/agents", icon: Users },
      { label: "Skills", href: "/skills", icon: Tag },
      { label: "Audit Logs", href: "/audit", icon: ShieldCheck },
    ],
  },
  {
    label: "Configure",
    items: [
      { label: "Channels", href: "/settings/channels", icon: Inbox },
      { label: "Webhooks", href: "/webhooks", icon: Webhook },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Profile", href: "/profile", icon: UserCircle },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const teardown = useInboxStore((s) => s.teardown);
  const isConnected = useInboxStore((s) => s.isConnected);

  function handleLogout() {
    teardown();
    document.cookie = "access_token=; path=/; max-age=0";
    router.push("/login");
  }

  return (
    <aside className="w-[220px] h-screen flex flex-col shrink-0 bg-[#111111] border-r border-[#1f1f1f]">
      {/* Brand */}
      <div className="h-[60px] flex items-center px-5 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-semibold text-[15px] tracking-tight">Velo</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ label, href, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors group ${
                      active
                        ? "bg-[#1f1f1f] text-white"
                        : "text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-300"
                      }`}
                    />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-[#1f1f1f] space-y-0.5">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? "bg-emerald-400" : "bg-zinc-600"}`} />
          <span className={`text-[12px] ${isConnected ? "text-zinc-400" : "text-zinc-600"}`}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1a1a] transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
