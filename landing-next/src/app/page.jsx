"use client";

import { motion, useInView, animate, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const ease = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

const stagger = (d = 0.08) => ({
  hidden: {},
  show: { transition: { staggerChildren: d } },
});

function useCount(to) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const ctrl = animate(0, to, {
      duration: 2.2,
      ease: "easeOut",
      onUpdate: (v) => {
        if (to === 99.9) setVal(v >= 99.9 ? 99.9 : parseFloat(v.toFixed(1)));
        else setVal(Math.round(v));
      },
    });
    return ctrl.stop;
  }, [inView, to]);
  return { ref, val };
}

function InView({ children, className, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={fadeUp}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const WAVE_HEIGHTS = Array.from({ length: 38 }, (_, i) => {
  const x = i / 38;
  return 4 + Math.abs(Math.sin(x * Math.PI * 5) * 18 + Math.sin(x * Math.PI * 11 + 1) * 10);
});

function Waveform({ active }) {
  return (
    <div className="flex items-center gap-[2px]" style={{ height: 28 }}>
      {WAVE_HEIGHTS.map((h, i) => (
        <motion.div
          key={i}
          className={`w-[2px] rounded-full transition-colors duration-500 ${active ? "bg-green-400" : "bg-zinc-700"}`}
          animate={active ? { height: [2, h, 2] } : { height: 3 }}
          transition={
            active
              ? { duration: 0.75 + (i % 6) * 0.12, repeat: Infinity, delay: i * 0.022, ease: "easeInOut" }
              : { duration: 0.4 }
          }
        />
      ))}
    </div>
  );
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    ["Features", "#features"],
    ["How it works", "#how"],
    ["Pricing", "#pricing"],
    ["Docs", "#"],
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/90 backdrop-blur-xl border-b border-zinc-900" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded bg-green-400 flex items-center justify-center group-hover:bg-green-300 transition-colors">
              <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="font-bold text-white text-[15px] tracking-tight">Velo</span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {links.map(([label, href]) => (
              <a key={label} href={href} className="text-sm text-zinc-400 hover:text-white transition-colors">
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Log in
            </a>
            <a
              href="#pricing"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-black bg-green-400 hover:bg-green-300 transition-colors"
            >
              Get started
            </a>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-zinc-900 bg-black/95 backdrop-blur-xl px-6 py-4 space-y-1 overflow-hidden"
          >
            {links.map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
              >
                {label}
              </a>
            ))}
            <div className="pt-3 border-t border-zinc-900">
              <a
                href="#pricing"
                className="block w-full text-center px-4 py-2.5 rounded-lg bg-green-400 text-black text-sm font-semibold"
              >
                Get started free
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────

function Hero() {
  const [demoActive, setDemoActive] = useState(false);

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center pt-20 pb-24 overflow-hidden">
      <div className="absolute inset-0 dot-grid" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-green-500/[0.035] blur-[160px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
        <motion.div initial="hidden" animate="show" variants={stagger(0.1)}>

          <motion.div variants={fadeUp} className="mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-green-400 border border-green-400/20 bg-green-400/[0.06] px-3.5 py-1.5 rounded-full">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
              Skill-based routing + AI RAG — production ready
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-[84px] font-black tracking-tighter text-white leading-[0.9] mb-6"
          >
            Route every chat to<br />
            <span className="text-green-400">the right agent, instantly.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Velo is a multi-tenant customer support platform with Least Active Routing, an AI knowledge base powered by GPT-4o-mini and pgvector, and an embeddable widget that ships via three HTML attributes.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3 mb-14">
            <a
              href="#pricing"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-black bg-green-400 hover:bg-green-300 transition-colors shadow-lg shadow-green-500/10"
            >
              Start free 14-day trial
            </a>
            <button
              onClick={() => setDemoActive(!demoActive)}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium border transition-all duration-300 ${
                demoActive
                  ? "bg-green-400/10 border-green-400/25 text-green-400"
                  : "border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white bg-zinc-950"
              }`}
            >
              <svg
                className={`w-4 h-4 flex-shrink-0 transition-colors ${demoActive ? "text-green-400" : "text-zinc-500"}`}
                fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              <span>{demoActive ? "Stop demo" : "See routing in action"}</span>
              <Waveform active={demoActive} />
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mx-auto max-w-2xl rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 text-left shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                </div>
                <span className="text-xs text-zinc-600 font-mono">your-site.html</span>
              </div>
              <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full tracking-wide">
                3 ATTRIBUTES. LIVE.
              </span>
            </div>
            <div className="p-6 font-mono text-sm leading-loose">
              <div className="text-zinc-600 text-xs">{`<!-- Step 1: load the widget bundle -->`}</div>
              <div className="mt-2">
                <span className="text-zinc-500">&lt;</span>
                <span className="text-green-400">script</span>
                <span className="text-blue-400"> src</span>
                <span className="text-zinc-500">=</span>
                <span className="text-amber-300">"https://cdn.velo.ai/widget.js"</span>
                <span className="text-zinc-500">&gt;&lt;/</span>
                <span className="text-green-400">script</span>
                <span className="text-zinc-500">&gt;</span>
              </div>
              <div className="mt-3 text-zinc-600 text-xs">{`<!-- Step 2: drop the custom element -->`}</div>
              <div className="mt-2">
                <span className="text-zinc-500">&lt;</span>
                <span className="text-green-400">velo-widget</span>
              </div>
              <div className="ml-6">
                <span className="text-blue-400">api-key</span>
                <span className="text-zinc-500">=</span>
                <span className="text-amber-300">"pk_live_xxxxxxxxxxxx"</span>
              </div>
              <div className="ml-6">
                <span className="text-blue-400">skill-id</span>
                <span className="text-zinc-500">=</span>
                <span className="text-amber-300">"550e8400-e29b-41d4-a716-..."</span>
              </div>
              <div className="ml-6">
                <span className="text-blue-400">socket-url</span>
                <span className="text-zinc-500">=</span>
                <span className="text-amber-300">"https://rt.velo.ai"</span>
              </div>
              <div>
                <span className="text-zinc-500">/&gt;</span>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}

// ─── MARQUEE ─────────────────────────────────────────────────────────────────

const LOGOS = ["E-commerce", "SaaS", "FinTech", "HealthTech", "EdTech", "Agencies", "Logistics", "HR Platforms", "DevTools", "MarketingTech", "PropTech", "LegalTech"];

function LogoMarquee() {
  const doubled = [...LOGOS, ...LOGOS];
  return (
    <div className="border-y border-zinc-900 py-10 overflow-hidden">
      <p className="text-center text-[11px] text-zinc-600 uppercase tracking-[0.25em] mb-8 font-medium">
        Built for every B2B team that talks to customers
      </p>
      <div className="flex w-max animate-marquee">
        {doubled.map((name, i) => (
          <div key={i} className="flex items-center gap-3 px-8">
            <span className="w-1 h-1 rounded-full bg-green-400/30" />
            <span className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors font-medium whitespace-nowrap">
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STATS ───────────────────────────────────────────────────────────────────

function StatItem({ to, suffix, label, prefix = "" }) {
  const { ref, val } = useCount(to);
  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl lg:text-6xl font-black tracking-tighter text-white tabular-nums">
        {prefix}{to === 99.9 ? (val >= 99 ? "99.9" : val) : val.toLocaleString()}{suffix}
      </div>
      <p className="text-zinc-500 text-sm mt-3 font-medium">{label}</p>
    </div>
  );
}

function Stats() {
  const stats = [
    { to: 68, suffix: "ms", label: "Avg routing decision time" },
    { to: 99.9, suffix: "%", label: "Platform uptime SLA" },
    { to: 5, suffix: " min", label: "Widget embed time" },
    { to: 5, suffix: "", label: "Max concurrent chats / agent" },
  ];
  return (
    <section className="py-20 border-b border-zinc-900">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          {stats.map((s, i) => (
            <InView key={i} delay={i * 0.07}>
              <StatItem {...s} />
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FEATURES ────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    num: "01",
    icon: (
      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    title: "Least Active Routing (LAR)",
    desc: "Every incoming chat is routed to the online agent with the matching skill and the lowest active load. Atomic Lua scripts prevent race conditions — no double-assignments, ever.",
  },
  {
    num: "02",
    icon: (
      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: "AI RAG Knowledge Base",
    desc: "Upload docs once. Velo chunks text (1 000-char windows, 200-char overlap), embeds with text-embedding-3-large, and stores in a tenant-isolated pgvector collection. Answers grounded by GPT-4o-mini at temperature 0.2 — factual, never hallucinated.",
  },
  {
    num: "03",
    icon: (
      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Real-Time WebSocket Messaging",
    desc: "Socket.io backed by a Redis pub/sub adapter delivers messages in under 100ms. Agents and visitors get live typing indicators, presence updates (online/away/offline), and instant conversation state changes.",
  },
  {
    num: "04",
    icon: (
      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    title: "Multi-Tenant Architecture",
    desc: "Full database-level isolation — every model carries a tenant FK enforced at the Django model layer. Redis keys, Socket.io rooms, and pgvector collections are all namespaced per tenant. One platform, unlimited clients, zero data bleed.",
  },
  {
    num: "05",
    icon: (
      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    title: "Three-Attribute Widget Embed",
    desc: "One script tag. One custom element with api-key, skill-id, and socket-url. The widget is a Preact app running inside a Shadow DOM — zero CSS bleed, works on every stack, live in under 5 minutes.",
  },
  {
    num: "06",
    icon: (
      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: "FIFO Queue with Auto-Drain",
    desc: "When all agents are at capacity, visitors enter a per-skill Redis sorted set (FIFO by timestamp). The moment an agent resolves a chat and frees a slot, the next queued visitor is atomically assigned — no manual intervention, no dropped chats.",
  },
];

function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" className="py-28 lg:py-36">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          variants={stagger(0.1)}
          className="mb-16"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-4">
            Platform
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black tracking-tighter text-white max-w-xl leading-tight">
            The full routing + AI stack, out of the box.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-zinc-500 text-lg mt-4 max-w-lg leading-relaxed">
            Every layer — routing, queuing, AI, persistence, embed — built and owned by Velo. No stitching third-party tools together.
          </motion.p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-900">
          {FEATURES.map((f, i) => (
            <InView key={i} delay={i * 0.04}>
              <div className="bg-black p-7 hover:bg-zinc-950 transition-colors h-full group">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-green-400/20 group-hover:bg-green-400/5 transition-all duration-300">
                    {f.icon}
                  </div>
                  <span className="font-mono text-xs text-zinc-700 group-hover:text-zinc-500 transition-colors">{f.num}</span>
                </div>
                <h3 className="text-white font-bold text-sm mb-2 tracking-tight">{f.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "001",
    tag: "Setup",
    title: "Create tenant, skills, and agents",
    desc: "Sign up, create your tenant, define skills (e.g. Billing, Technical, Sales), invite agents, assign skills per agent, and set each agent's max concurrent chat capacity. Your routing topology is live in under 10 minutes.",
    detail: "Tenant isolation · Custom skills · Agent invites · Role: admin or agent · Max capacity per agent",
  },
  {
    num: "002",
    tag: "Train",
    title: "Feed your knowledge base",
    desc: "POST your FAQs, product docs, and policies to /api/v1/rag/documents/. Velo auto-chunks (1 000 chars / 200 overlap), embeds via text-embedding-3-large, and indexes into a tenant-scoped pgvector collection. Re-POST to re-embed on content changes.",
    detail: "GPT-4o-mini · text-embedding-3-large · pgvector · top-4 chunk retrieval · temp 0.2",
  },
  {
    num: "003",
    tag: "Ship",
    title: "Paste 3 attributes and go live",
    desc: "Add the script tag and drop <velo-widget api-key='...' skill-id='...' socket-url='...'> anywhere in your HTML. The Preact widget bootstraps in a Shadow DOM, connects to your Socket.io server, and starts routing — zero build step, zero CSS conflicts.",
    detail: "Shadow DOM · Preact bundle · States: idle → routing → queued → active · Works on any stack",
  },
];

function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [active, setActive] = useState(0);

  return (
    <section id="how" className="py-28 lg:py-36 border-y border-zinc-900">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          variants={stagger(0.1)}
          className="mb-16"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-4">
            Getting started
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black tracking-tighter text-white max-w-xl leading-tight">
            From signup to live widget in three steps.
          </motion.h2>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-16 items-start">
          <div className="space-y-2">
            {STEPS.map((s, i) => (
              <InView key={i} delay={i * 0.08}>
                <button
                  onClick={() => setActive(i)}
                  className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ${
                    active === i
                      ? "bg-zinc-950 border-zinc-700"
                      : "border-transparent hover:border-zinc-900 hover:bg-zinc-950/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`font-mono text-xs font-bold transition-colors flex-shrink-0 ${active === i ? "text-green-400" : "text-zinc-700"}`}>
                      {s.num}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className={`text-sm font-semibold transition-colors ${active === i ? "text-white" : "text-zinc-400"}`}>
                          {s.title}
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors flex-shrink-0 ${
                          active === i
                            ? "text-green-400 bg-green-400/10 border-green-400/20"
                            : "text-zinc-700 bg-transparent border-zinc-800"
                        }`}>
                          {s.tag}
                        </span>
                      </div>
                      <AnimatePresence>
                        {active === i && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="text-xs text-zinc-500 leading-relaxed overflow-hidden"
                          >
                            {s.desc}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </button>
              </InView>
            ))}
          </div>

          <InView delay={0.2}>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-600">step_{STEPS[active].num}.md</span>
                <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
                  {STEPS[active].tag.toUpperCase()}
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="p-7"
                >
                  <div className="text-7xl font-black font-mono text-zinc-900 mb-6 select-none">
                    {STEPS[active].num}
                  </div>
                  <h3 className="text-white font-bold text-xl mb-3 tracking-tight">{STEPS[active].title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-6">{STEPS[active].desc}</p>
                  <div className="border-t border-zinc-800 pt-4">
                    <p className="text-[11px] text-zinc-600 font-mono leading-relaxed">{STEPS[active].detail}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </InView>
        </div>
      </div>
    </section>
  );
}

// ─── TESTIMONIALS ────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "Velo's LAR algorithm eliminated the manual reassignment work our team was doing 20 times a day. Chats go to the right agent atomically — we don't even think about it anymore.",
    name: "Sarah Chen",
    role: "Head of Support, TechFlow",
    initials: "SC",
  },
  {
    quote: "We white-labeled Velo across 14 client sites in a single sprint. The Shadow DOM isolation means their CSS never touches ours. Three attributes and you're live — it's ridiculous how easy it is.",
    name: "Marcus Rodriguez",
    role: "CTO, NovaSoft Agency",
    initials: "MR",
  },
  {
    quote: "The tenant isolation model is exactly what compliance required. Tenant FK enforced at the model layer, pgvector collections namespaced per tenant. We audited the architecture before signing.",
    name: "Aisha Patel",
    role: "VP Engineering, ScaleAI",
    initials: "AP",
  },
  {
    quote: "We stress-tested the routing engine at 400 concurrent chats. Lua atomic scripts held — zero double-assignments. The FIFO queue drained perfectly on every resolution.",
    name: "James Kim",
    role: "Platform Lead, Vertex Systems",
    initials: "JK",
  },
  {
    quote: "Uploaded our entire 200-page product guide to the RAG system. Temperature 0.2 keeps GPT-4o-mini grounded — agents get draft replies they actually send without editing.",
    name: "Lena Fischer",
    role: "Support Manager, DataBridge",
    initials: "LF",
  },
  {
    quote: "The presence system (online/away/offline) with per-agent capacity caps is the feature I didn't know I needed. Routing respects capacity at the Redis layer. It just works.",
    name: "Tom Nakamura",
    role: "Founder, CloudPulse",
    initials: "TN",
  },
];

function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-28 lg:py-36">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          variants={stagger(0.1)}
          className="mb-16"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-4">
            Customer stories
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black tracking-tighter text-white max-w-xl leading-tight">
            Teams that ship support infrastructure, not duct tape.
          </motion.h2>
        </motion.div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {TESTIMONIALS.map((t, i) => (
            <InView key={i} delay={i * 0.05} className="break-inside-avoid mb-4">
              <div className="card card-hover rounded-xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array(5).fill(0).map((_, j) => (
                    <svg key={j} className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-zinc-900">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{t.name}</p>
                    <p className="text-zinc-600 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PRICING ─────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Starter",
    mo: 49,
    yr: 490,
    desc: "For small teams getting their first AI-augmented support channel live.",
    features: [
      "5 agents",
      "3 skills",
      "5,000 conversations/mo",
      "AI RAG (up to 50 docs)",
      "Embeddable widget",
      "Skill-based routing + FIFO queue",
      "Email support",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Growth",
    mo: 149,
    yr: 1490,
    desc: "Full routing engine, unlimited knowledge base, and priority support for scaling teams.",
    features: [
      "20 agents",
      "Unlimited skills",
      "50,000 conversations/mo",
      "AI RAG (unlimited docs)",
      "Configurable agent capacity",
      "Priority queue management",
      "Analytics dashboard",
      "Priority support",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    mo: null,
    yr: null,
    desc: "Unlimited scale, on-premise deployment, custom SLA, and SSO for large organisations.",
    features: [
      "Unlimited agents",
      "Unlimited conversations",
      "Unlimited RAG documents",
      "On-premise Docker deployment",
      "SSO / SAML",
      "Custom SLA & uptime",
      "Dedicated success manager",
      "Custom integrations",
    ],
    cta: "Contact sales",
    highlight: false,
  },
];

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="pricing" className="py-28 lg:py-36 border-y border-zinc-900">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          variants={stagger(0.1)}
          className="mb-14"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-4">
            Pricing
          </motion.p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black tracking-tighter text-white max-w-sm leading-tight">
              Simple, transparent pricing.
            </motion.h2>
            <motion.div variants={fadeUp} className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!annual ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${annual ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
              >
                Annual
                <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">
                  −17%
                </span>
              </button>
            </motion.div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((p, i) => (
            <InView key={i} delay={i * 0.07}>
              <div className={`relative rounded-2xl p-7 h-full flex flex-col transition-all duration-200 ${
                p.highlight
                  ? "bg-zinc-950 border border-green-400/20 shadow-[0_0_60px_rgba(74,222,128,0.05)]"
                  : "card"
              }`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-6">
                    <span className="text-[10px] font-bold text-black bg-green-400 px-3 py-1 rounded-full tracking-wide">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-white font-bold text-base mb-1">{p.name}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{p.desc}</p>
                </div>

                <div className="mb-8">
                  {p.mo ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-white tracking-tighter">
                        ${annual ? Math.round(p.yr / 12) : p.mo}
                      </span>
                      <span className="text-zinc-600 text-sm">/month</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-black text-white tracking-tighter">Custom</div>
                  )}
                  {p.mo && annual && (
                    <p className="text-green-400 text-xs mt-1.5 font-medium">Billed ${p.yr}/year · 2 months free</p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-zinc-400">
                      <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="#"
                  className={`block text-center px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    p.highlight
                      ? "bg-green-400 text-black hover:bg-green-300"
                      : "border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 hover:bg-zinc-950"
                  }`}
                >
                  {p.cta}
                </a>
              </div>
            </InView>
          ))}
        </div>

        <InView delay={0.2}>
          <p className="text-center text-zinc-600 text-sm mt-8">
            All plans include a 14-day free trial · No credit card required · Cancel anytime
          </p>
        </InView>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "How does Least Active Routing work exactly?",
    a: "When a visitor starts a chat with a required skill, Velo queries Redis for all online agents holding that skill whose active chat count is below their max_chat_capacity. It sorts by ascending load and uses an atomic Lua script to increment the winner's counter. If the slot is gone by the time the script runs (race condition), it retries the next candidate — ensuring no double-assignments.",
  },
  {
    q: "What happens when every agent with the required skill is at capacity?",
    a: "The conversation is pushed into a per-skill Redis sorted set (FIFO by timestamp). The visitor's widget transitions to the 'queued' state and they receive a notification. The instant any agent with that skill resolves a chat, the queue drain fires atomically — the oldest queued visitor is claimed and assigned without any manual step.",
  },
  {
    q: "How does the AI RAG system work technically?",
    a: "You POST documents to /api/v1/rag/documents/. Velo splits the text using a recursive character splitter (chunk_size=1000, overlap=200), generates embeddings with OpenAI text-embedding-3-large via Langchain, and stores them in a tenant-scoped pgvector collection (velo_rag_{tenant_id}). On a query, the top 4 chunks by cosine similarity are retrieved and passed to GPT-4o-mini at temperature 0.2, which generates a grounded answer. Re-POST a document to re-embed updated content.",
  },
  {
    q: "How is tenant data isolated?",
    a: "Every Django model has a tenant ForeignKey with db_index=True. All queries are filtered by the authenticated user's tenant — it's enforced at the abstract TenantAwareModel base class level, not just in views. Redis keys are namespaced as agent:{tenantId}:{userId} and queue:{tenantId}:{skillId}. pgvector collections are per-tenant. Socket.io rooms are tenant-scoped. It's impossible for one tenant's data to appear in another's context.",
  },
  {
    q: "How do I embed the widget on my site?",
    a: "Add a script tag loading the Velo bundle, then drop <velo-widget api-key='pk_live_...' skill-id='<uuid>' socket-url='https://rt.velo.ai'></velo-widget> anywhere in your HTML. The widget is a Preact app bootstrapped inside a Shadow DOM — it has zero CSS interaction with your site. No build pipeline required. Widget states: idle → routing → queued → active → resolved.",
  },
  {
    q: "What are the agent role differences?",
    a: "Admin users have full tenant access: create/edit skills, manage agents, set agent capacity and skill assignments, upload RAG documents, view all conversations. Agent users see the live inbox, accept assigned chats, send messages, set their presence (online/away/offline), and resolve conversations. Both authenticate via email/password and receive JWT access + refresh tokens.",
  },
  {
    q: "Can I self-host Velo on-premise?",
    a: "Yes, on the Enterprise plan. Velo is a five-service Docker stack: Django (Gunicorn), Node.js Socket.io server, Next.js dashboard, Preact widget (CDN-served), PostgreSQL + pgvector, and Redis. You own every layer. We provide the Docker Compose configuration, environment setup guide, and dedicated support for deployment and upgrades.",
  },
];

function FAQ() {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-28 lg:py-36">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          variants={stagger(0.1)}
          className="mb-14"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-4">
            FAQ
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black tracking-tighter text-white leading-tight">
            Technical questions, answered honestly.
          </motion.h2>
        </motion.div>

        <div className="divide-y divide-zinc-900">
          {FAQS.map((item, i) => (
            <InView key={i} delay={i * 0.03}>
              <div>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left group"
                >
                  <span className={`text-sm font-semibold transition-colors pr-6 ${open === i ? "text-white" : "text-zinc-300 group-hover:text-white"}`}>
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: open === i ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 w-5 h-5 rounded-full border border-zinc-800 group-hover:border-zinc-600 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-2.5 h-2.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </motion.div>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: open === i ? "auto" : 0, opacity: open === i ? 1 : 0 }}
                  transition={{ duration: 0.28, ease }}
                  style={{ overflow: "hidden" }}
                >
                  <p className="pb-5 text-zinc-500 text-sm leading-relaxed">{item.a}</p>
                </motion.div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-28 lg:py-36 border-t border-zinc-900 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-green-500/[0.04] rounded-full blur-[160px]" />
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <InView>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-green-400 border border-green-400/20 bg-green-400/[0.06] px-3.5 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            No credit card required
          </span>
        </InView>

        <InView delay={0.1}>
          <h2 className="text-5xl lg:text-6xl font-black tracking-tighter text-white mt-6 mb-5 leading-tight">
            Stop routing chats manually.<br />
            <span className="text-green-400">Let Velo do it atomically.</span>
          </h2>
        </InView>

        <InView delay={0.18}>
          <p className="text-zinc-500 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            Skill-based routing, AI-grounded replies, and a three-attribute widget embed — all in one platform, live in under an hour.
          </p>
        </InView>

        <InView delay={0.25}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#pricing"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold text-black bg-green-400 hover:bg-green-300 transition-colors shadow-xl shadow-green-500/10"
            >
              Start free 14-day trial
            </a>
            <a
              href="#"
              className="px-7 py-3.5 rounded-xl text-sm text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-600 hover:bg-zinc-950 transition-all"
            >
              Book a demo
            </a>
          </div>
          <p className="text-zinc-700 text-xs mt-5 font-mono">Setup in 5 min · Cancel anytime · GDPR compliant · On-premise available</p>
        </InView>
      </div>
    </section>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────

function Footer() {
  const cols = [
    { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap", "Status"] },
    { title: "Developers", links: ["API Reference", "Widget SDK", "Self-hosting", "Webhooks", "GitHub"] },
    { title: "Company", links: ["About", "Blog", "Careers", "Security", "Press"] },
    { title: "Legal", links: ["Privacy Policy", "Terms of Service", "DPA", "Cookie Policy"] },
  ];

  return (
    <footer className="border-t border-zinc-900 pt-16 pb-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2.5 mb-5 group">
              <div className="w-7 h-7 rounded bg-green-400 flex items-center justify-center group-hover:bg-green-300 transition-colors">
                <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span className="font-bold text-white text-[15px] tracking-tight">Velo</span>
            </a>
            <p className="text-zinc-600 text-sm leading-relaxed mb-6 max-w-[200px]">
              Skill-based routing and AI support infrastructure for B2B teams.
            </p>
            <div className="flex gap-2">
              {[
                { path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.735-8.835L2.25 2.25h6.163l4.238 5.607 5.593-5.607zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                { path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
                { path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
              ].map((s, idx) => (
                <a key={idx} href="#" className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-white hover:border-zinc-600 transition-all">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-zinc-600 hover:text-zinc-300 text-sm transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-zinc-700 text-xs font-mono">© 2025 Velo Technologies, Inc. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-zinc-700 font-mono">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function Page() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <LogoMarquee />
        <Stats />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
