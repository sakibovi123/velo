"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useInboxStore from "@/store/inboxStore";

const NAV = [
  { label: "Inbox", href: "/inbox", icon: "💬" },
  { label: "Reports", href: "/reports", icon: "📊" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
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
    <aside className="flex flex-col w-16 lg:w-56 h-full bg-gray-900 text-gray-300 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <span className="text-indigo-400 text-xl font-bold">V</span>
        <span className="hidden lg:block text-white font-semibold text-lg">Velo</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV.map(({ label, href, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-gray-800 hover:text-white",
              ].join(" ")}
            >
              <span>{icon}</span>
              <span className="hidden lg:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Connection status + logout */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-3">
        <div className="flex items-center gap-2 px-2 text-xs">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? "bg-green-400" : "bg-gray-500"}`} />
          <span className="hidden lg:block">{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>🚪</span>
          <span className="hidden lg:block">Logout</span>
        </button>
      </div>
    </aside>
  );
}
