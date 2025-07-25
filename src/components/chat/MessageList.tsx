"use client";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  // Find the last assistant message index for typing effect
  const lastAssistantIndex = messages
    .map((m, i) => (m.role === "assistant" ? i : -1))
    .filter((i) => i !== -1)
    .pop();

  // Typing effect state
  const [typedContent, setTypedContent] = useState("");
  const typingInterval = useRef<NodeJS.Timeout | null>(null);
  const lastAssistantId = messages[lastAssistantIndex]?.id;

  // Track previous assistant id to only trigger typing on new assistant message
  const prevAssistantId = useRef<string | undefined>();

  useEffect(() => {
    // Only run typing effect if the last assistant message is new
    if (
      typeof lastAssistantIndex === "number" &&
      lastAssistantIndex >= 0 &&
      messages[lastAssistantIndex] &&
      lastAssistantId !== prevAssistantId.current // Only if new assistant message
    ) {
      const content = messages[lastAssistantIndex].content;
      setTypedContent(""); // Reset on new message

      let i = 0;
      if (typingInterval.current) clearInterval(typingInterval.current);

      typingInterval.current = setInterval(() => {
        setTypedContent((prev) => {
          if (i >= content.length) {
            if (typingInterval.current) clearInterval(typingInterval.current);
            return content;
          }
          const next = content.slice(0, i + 1);
          i++;
          return next;
        });
      }, 20);

      // Update the ref to the current assistant id
      prevAssistantId.current = lastAssistantId;

      // Cleanup on unmount or new message
      return () => {
        if (typingInterval.current) clearInterval(typingInterval.current);
      };
    } else if (
      typeof lastAssistantIndex === "number" &&
      lastAssistantIndex >= 0 &&
      messages[lastAssistantIndex]
    ) {
      // If not a new assistant message, just show full content
      setTypedContent(messages[lastAssistantIndex].content);
    }
  }, [messages, lastAssistantIndex, lastAssistantId]);

  return (
    <div className="max-w-4xl mx-auto pb-32">
      {messages.map((message, index) => {
        const isTyping =
          message.role === "assistant" &&
          index === lastAssistantIndex &&
          lastAssistantId === prevAssistantId.current;
        return (
          <div
            key={message.id}
            className={`group w-full
              ${
                message.role === "assistant"
                  ? index === lastAssistantIndex
                    ? "mb-24"
                    : "mb-6"
                  : ""
              }
            `}
          >
            <div
              className={`flex gap-4 p-6 max-w-4xl mx-auto ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex-1 space-y-2 max-w-[70%] ${
                  message.role === "user" ? "flex flex-col items-end" : ""
                }`}
              >
                <div
                  className={`prose prose-invert max-w-none ${
                    message.role === "user"
                      ? "bg-[#2f2f2f] rounded-2xl px-4 py-3"
                      : ""
                  }`}
                >
                  <div
                    className={`whitespace-pre-wrap leading-relaxed ${
                      message.role === "user"
                        ? "text-[#ececf1]"
                        : "text-[#ececf1]"
                    }`}
                  >
                    {isTyping ? typedContent : message.content}
                    {isTyping &&
                      typedContent.length < message.content.length && (
                        <span className="animate-pulse">|</span>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
