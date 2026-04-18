"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login/", { email, password });
      document.cookie = `access_token=${data.data.access}; path=/; SameSite=Strict`;
      const next = searchParams.get("next") || "/inbox";
      router.push(next);
    } catch (err) {
      if (!err.response) {
        setError("Cannot reach server. Check your connection.");
      } else if (err.response.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError(err.response?.data?.error?.message ?? "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#111111] flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-indigo-400" strokeWidth={2.5} />
          </div>
          <span className="text-[20px] font-semibold text-zinc-900 tracking-tight">Velo</span>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-[17px] font-semibold text-zinc-900 mb-1">Sign in</h1>
          <p className="text-[13px] text-zinc-400 mb-6">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@company.com"
                className="w-full h-9 px-3 text-[13.5px] text-zinc-900 placeholder:text-zinc-400 bg-white border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 px-3 text-[13.5px] text-zinc-900 placeholder:text-zinc-400 bg-white border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <p className="text-[12.5px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-[#111111] hover:bg-zinc-800 disabled:bg-zinc-300 text-white text-[13.5px] font-medium rounded-lg transition-colors mt-1"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11.5px] text-zinc-400 mt-5">
          Velo Agent Dashboard · Workspace
        </p>
      </div>
    </div>
  );
}
