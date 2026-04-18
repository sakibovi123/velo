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

const io = new Server<
  Record<string, (...args: any[]) => void>,
  Record<string, (...args: any[]) => void>,
  Record<string, (...args: any[]) => void>,
  SocketData
>(httpServer, {
  cors: {
    origin: config.nodeEnv === "production" ? [] : "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// ─── Redis adapter (must precede middleware + event handlers) ─────────────────

await applyRedisAdapter(io);

// ─── Auth middleware (applied globally to every namespace) ────────────────────

io.use(socketAuthMiddleware);

// ─── Connection handler ───────────────────────────────────────────────────────

io.on("connection", (socket) => {
  const { role, userId, workspaceId } = socket.data;

  socket.join(`workspace:${workspaceId}`);

  if (role === "agent") {
    socket.join(`agents:${workspaceId}`);
    console.log(
      `[socket] agent connected   | user=${userId} workspace=${workspaceId} id=${socket.id}`
    );
  } else {
    console.log(
      `[socket] visitor connected | workspace=${workspaceId} id=${socket.id}`
    );
  }

  registerChatHandlers(io, socket);

  socket.on("disconnect", (reason) => {
    console.log(
      `[socket] disconnected | role=${role} workspace=${workspaceId} id=${socket.id} reason=${reason}`
    );
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port} (${config.nodeEnv})`);
});
