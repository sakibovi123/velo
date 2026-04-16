import { createAdapter } from "@socket.io/redis-adapter";
import type { Server } from "socket.io";
import { pubClient, subClient } from "./redisClient.js";

/**
 * Attaches the Redis pub/sub adapter to a Socket.io Server instance.
 * Must be called after the io server is created and before it starts
 * accepting connections. This enables horizontal scaling — any node in
 * the cluster can broadcast to sockets connected to any other node.
 */
export async function applyRedisAdapter(io: Server): Promise<void> {
  await pubClient.connect();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));
  console.log("[socket] Redis adapter attached");
}
