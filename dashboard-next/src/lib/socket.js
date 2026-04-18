import { io } from "socket.io-client";

let socket = null;

/**
 * Returns a singleton Socket.io client for the agent dashboard.
 * The JWT is sent in the handshake so the Node server can identify
 * the agent and their workspace without a separate HTTP lookup.
 *
 * @param {string} token  — JWT access token
 * @returns {import("socket.io-client").Socket}
 */
export function getSocket(token) {
  if (socket) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001", {
    auth: { token },
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
