"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Nutrition } from "@/lib/types";

export function Chat({ nutrition }: { nutrition: Nutrition }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Keep pinned to the latest token as it streams in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setError(null);

    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, nutrition }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((cur) => {
          const copy = cur.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      if (!acc.trim()) {
        setMessages((cur) => {
          const copy = cur.slice();
          copy[copy.length - 1] = {
            role: "assistant",
            content: "…I blanked on that one. Mind asking again?",
          };
          return copy;
        });
      }
    } catch {
      setError("Lost the thread there — give it another go.");
      setMessages((cur) =>
        cur.filter(
          (m, i) => !(i === cur.length - 1 && m.role === "assistant" && m.content === ""),
        ),
      );
    } finally {
      setStreaming(false);
      taRef.current?.focus();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[60vh] min-h-[460px] flex-col overflow-hidden rounded-lg border border-line bg-surface lg:h-[72vh]">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="max-w-xs text-pretty text-sm leading-relaxed text-ink-2">
              Ask anything about{" "}
              <span className="font-medium text-ink">{nutrition.food_name}</span> —
              calories, swaps, how it fits your day.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isUser = m.role === "user";
            const isLast = i === messages.length - 1;
            const isStreamingThis = isLast && m.role === "assistant" && streaming;
            return (
              <div
                key={i}
                className={isUser ? "flex justify-end" : "flex justify-start"}
              >
                {isUser ? (
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-surface-2 px-3.5 py-2 text-[14px] leading-relaxed text-ink">
                    {m.content}
                  </p>
                ) : (
                  <div className="max-w-[90%] text-[14px] leading-relaxed text-ink">
                    {m.content ? (
                      <p className="whitespace-pre-wrap">
                        {m.content}
                        {isStreamingThis && <Caret />}
                      </p>
                    ) : (
                      <TypingDots />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {error && (
        <p role="alert" className="px-4 pb-1 text-xs text-bad sm:px-5">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-line p-3 sm:px-4"
      >
        <textarea
          ref={taRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={`Ask about ${nutrition.food_name}…`}
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-line bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-ink-3 focus-visible:border-accent"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
            <path
              d="M12 19V5M12 5l-6 6M12 5l6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}

function Caret() {
  return (
    <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse bg-accent align-middle" />
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Assistant is typing">
      <span className="size-1.5 animate-bounce rounded-full bg-ink-3 [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-ink-3 [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-ink-3" />
    </span>
  );
}
