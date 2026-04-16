import Sidebar from "@/components/Sidebar";

/**
 * Authenticated shell layout.
 * The actual auth guard lives in middleware.js — by the time Next.js renders
 * this layout, the middleware has already verified the JWT cookie.
 */
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
