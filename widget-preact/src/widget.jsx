import { useState } from "preact/hooks";
import { ChatWindow } from "./components/ChatWindow";

/**
 * Root Preact component rendered inside the Shadow DOM.
 *
 * Props forwarded from the Custom Element attributes:
 *   socketClient    — pre-built socket client instance
 *   requiredSkillId — skill UUID to use when routing (from `skill-id` attribute)
 */
export function Widget({ socketClient, requiredSkillId }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div class="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-[2147483647]">
      {isOpen && (
        <ChatWindow
          socketClient={socketClient}
          requiredSkillId={requiredSkillId}
          onClose={() => setIsOpen(false)}
        />
      )}

      {/* Launcher button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        class="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg flex items-center justify-center text-white text-2xl transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? "✕" : "💬"}
      </button>
    </div>
  );
}
