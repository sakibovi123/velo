import { useState, useEffect, useRef } from "preact/hooks";
import { Message } from "./Message";

/**
 * ChatWindow — the main visible panel.
 *
 * Props:
 *   socketClient    — the object returned by createSocketClient()
 *   requiredSkillId — skill UUID to route this chat (from pre-chat form or AI)
 *   onClose         — callback to hide/close the widget
 */
export function ChatWindow({ socketClient, requiredSkillId, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      text: "Hi there! How can we help you today?",
      sender: "agent",
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  // "idle" | "routing" | "queued" | "active" | "error"
  const [chatStatus, setChatStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  // Stable chat ID for the lifetime of this conversation
  const chatIdRef = useRef(crypto.randomUUID());
  const bottomRef = useRef(null);

  useEffect(() => {
    socketClient.connect();

    socketClient._onConnect = () => {
      setIsConnected(true);
      // As soon as we're connected, fire chat:start so routing begins immediately
      setChatStatus("routing");
      socketClient.startChat(chatIdRef.current, requiredSkillId);
    };

    socketClient._onDisconnect = () => {
      setIsConnected(false);
      setChatStatus("idle");
    };

    socketClient._onMessage = (msg) => {
      setIsTyping(false);
      setChatStatus("active");
      setMessages((prev) => [...prev, msg]);
    };

    socketClient._onQueued = (msg) => {
      setChatStatus("queued");
      setStatusMessage(msg);
    };

    socketClient._onAgentJoined = () => {
      setChatStatus("active");
      setStatusMessage("");
    };

    socketClient._onError = (msg) => {
      setChatStatus("error");
      setStatusMessage(msg);
    };

    return () => socketClient.disconnect();
  }, [socketClient, requiredSkillId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend(e) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || chatStatus === "error") return;

    const outbound = {
      id: crypto.randomUUID(),
      text,
      sender: "visitor",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, outbound]);
    setInputValue("");
    setIsTyping(true);
    socketClient.sendMessage(text);
  }

  const headerLabel =
    chatStatus === "queued"   ? "In Queue"  :
    chatStatus === "routing"  ? "Connecting…" :
    chatStatus === "active"   ? "Support"   :
    chatStatus === "error"    ? "Error"     : "Support";

  const headerDotColor =
    chatStatus === "active"   ? "bg-green-400"  :
    chatStatus === "queued"   ? "bg-yellow-400" :
    chatStatus === "error"    ? "bg-red-400"    : "bg-gray-400";

  const inputDisabled = !isConnected || chatStatus === "error";

  return (
    <div class="flex flex-col w-80 h-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden font-sans">
      {/* Header */}
      <div class="flex items-center justify-between px-4 py-3 bg-indigo-600">
        <div class="flex items-center gap-2">
          <span class={`w-2 h-2 rounded-full ${headerDotColor}`} />
          <span class="text-white font-semibold text-sm">{headerLabel}</span>
        </div>
        <button
          onClick={onClose}
          class="text-indigo-200 hover:text-white transition-colors text-lg leading-none"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Status banner (queued / error) */}
      {statusMessage && (
        <div class={`px-4 py-2 text-xs text-center ${chatStatus === "error" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-800"}`}>
          {statusMessage}
        </div>
      )}

      {/* Message list */}
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.map((msg) => (
          <Message key={msg.id} {...msg} />
        ))}
        {isTyping && (
          <div class="flex justify-start mb-2">
            <div class="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2">
              <span class="flex gap-1 items-center h-4">
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} class="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
        <input
          type="text"
          value={inputValue}
          onInput={(e) => setInputValue(e.target.value)}
          placeholder={inputDisabled ? "Waiting for agent…" : "Type a message…"}
          disabled={inputDisabled}
          class="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || inputDisabled}
          class="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full transition-colors shrink-0"
          aria-label="Send"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
