import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import config from "./config.js";
import { applyRedisAdapter } from "./lib/socketAdapter.js";
import {
  socketAuthMiddleware,
  type SocketData,
} from "./middleware/socketAuth.js";
import { registerChatHandlers } from "./handlers/chatHandlers.js";

// ─── Express ──────────────────────────────────────────────────────────────────

const app = express();

app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" }, error: null });
});

// ─── HTTP + Socket.io ─────────────────────────────────────────────────────────

const httpServer = createServer(app);

// The four generics are: ClientToServerEvents, ServerToClientEvents,
// InterServerEvents, SocketData. Using empty objects for the event maps
// until Phase 3 defines the full event contracts.
const io = new Server<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    // Tighten to explicit production origins before going live
    origin: config.nodeEnv === "production" ? [] : "*",
    methods: ["GET", "POST"],
  },
  // Prefer WebSocket; fall back to long-polling only when necessary
  transports: ["websocket", "polling"],
});

// ─── Redis adapter (must precede middleware + event handlers) ─────────────────

await applyRedisAdapter(io);

// ─── Auth middleware (applied globally to every namespace) ────────────────────

io.use(socketAuthMiddleware);

// ─── Connection handler ───────────────────────────────────────────────────────

io.on("connection", (socket) => {
  // socket.data is fully typed as SocketData here — no casting needed
  const { role, userId, tenantId } = socket.data;

  // Every socket joins its tenant room — enables server-side broadcasts
  // scoped to a tenant without leaking room names to clients.
  socket.join(`tenant:${tenantId}`);

  if (role === "agent") {
    socket.join(`agents:${tenantId}`);
    console.log(
      `[socket] agent connected   | user=${userId} tenant=${tenantId} id=${socket.id}`
    );
  } else {
    console.log(
      `[socket] visitor connected | tenant=${tenantId} id=${socket.id}`
    );
  }

  // Mount routing + chat event handlers for this socket
  registerChatHandlers(io, socket);

  socket.on("disconnect", (reason) => {
    console.log(
      `[socket] disconnected | role=${role} tenant=${tenantId} id=${socket.id} reason=${reason}`
    );
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port} (${config.nodeEnv})`);
});
