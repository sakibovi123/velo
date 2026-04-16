/**
 * A single chat message bubble.
 * `sender` is either "visitor" or "agent".
 */
export function Message({ text, sender, timestamp }) {
  const isVisitor = sender === "visitor";

  return (
    <div class={`flex w-full mb-2 ${isVisitor ? "justify-end" : "justify-start"}`}>
      <div
        class={[
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed break-words",
          isVisitor
            ? "bg-indigo-600 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-800 rounded-bl-sm",
        ].join(" ")}
      >
        <p>{text}</p>
        <span class={`block text-[10px] mt-1 ${isVisitor ? "text-indigo-200" : "text-gray-400"} text-right`}>
          {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
