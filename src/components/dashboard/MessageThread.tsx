import { useEffect, useRef } from "react";
import type { MessageDTO } from "./ticketApi";

export function MessageThread({
  messages,
  mineSender,
}: {
  messages: MessageDTO[];
  mineSender: "customer" | "agent";
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/15 text-center text-sm text-white/50">
        No messages yet. Start the conversation below.
      </div>
    );
  }

  return (
    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
      {messages.map((m, i) => {
        const mine = m.sender === mineSender;
        return (
          <div
            key={m.id ?? i}
            className={`flex ${mine ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow ${
                mine
                  ? "rounded-bl-md border border-white/10 bg-white/10 text-white"
                  : "rounded-br-md bg-gradient-to-r from-grad-orange to-grad-red text-white"
              }`}
            >
              <div className="mb-0.5 flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-white/70">
                  {m.senderName || (mine ? "You" : m.sender)}
                </span>
                {m.createdAt ? (
                  <span className="text-[10px] text-white/50">
                    {new Date(m.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap break-words">{m.message}</p>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}