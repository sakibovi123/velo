import { io } from "socket.io-client";

/**
 * Creates and manages a Socket.io connection to the Velo Node server.
 *
 * Emits:
 *   chat:start    { chatId, requiredSkillId }  — initiates skill-based routing
 *   message:send  { text, timestamp }          — visitor message
 *
 * Listens:
 *   message:incoming   — agent reply
 *   chat:queued        — no agent available, visitor is in queue
 *   chat:agentJoined   — agent was assigned and joined
 *   chat:error         — routing or server error
 */
export function createSocketClient({
  socketUrl,
  apiKey,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  onQueued,
  onAgentJoined,
}) {
  const socket = io(socketUrl, {
    auth: { apiKey },
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => onConnect?.());
  socket.on("disconnect", (reason) => onDisconnect?.(reason));
  socket.on("connect_error", (err) => onError?.(err.message));

  // Agent reply
  socket.on("message:incoming", (payload) => {
    onMessage?.({
      id: payload.id ?? crypto.randomUUID(),
      text: payload.text,
      sender: "agent",
      timestamp: payload.timestamp ?? Date.now(),
    });
  });

  // Visitor placed in queue — no agent with required skill is free
  socket.on("chat:queued", (payload) => {
    onQueued?.(payload.message ?? "You are in the queue. An agent will be with you shortly.");
  });

  // An agent was assigned and has joined the conversation
  socket.on("chat:agentJoined", (payload) => {
    onAgentJoined?.(payload);
  });

  // Server-side routing or validation error
  socket.on("chat:error", (payload) => {
    onError?.(payload.message ?? "An error occurred. Please try again.");
  });

  // Declare callback slots on the object so they're known properties.
  // ChatWindow overwrites these after mount; index.js forwards socket
  // events into them via the closures above.
  const client = {
    _onConnect: /** @type {null|(() => void)} */ (null),
    _onDisconnect: /** @type {null|((reason: string) => void)} */ (null),
    _onMessage: /** @type {null|((msg: object) => void)} */ (null),
    _onQueued: /** @type {null|((msg: string) => void)} */ (null),
    _onAgentJoined: /** @type {null|((data: object) => void)} */ (null),
    _onError: /** @type {null|((msg: string) => void)} */ (null),

    connect() {
      socket.connect();
    },
    disconnect() {
      socket.disconnect();
    },
    /**
     * Start a new chat. Must be called before sendMessage.
     * @param {string} chatId          — UUID generated client-side
     * @param {string} requiredSkillId — skill UUID from the pre-chat form or AI classifier
     */
    startChat(chatId, requiredSkillId) {
      socket.emit("chat:start", { chatId, requiredSkillId });
    },
    /**
     * Send a visitor message.
     * @param {string} text
     */
    sendMessage(text) {
      socket.emit("message:send", { text, timestamp: Date.now() });
    },
  };

  return client;
}
