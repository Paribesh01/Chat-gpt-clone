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
  // Find the last assistant message index for spacing
  const lastAssistantIndex = messages
    .map((m, i) => (m.role === "assistant" ? i : -1))
    .filter((i) => i !== -1)
    .pop();

  return (
    <div className="max-w-4xl mx-auto pb-32">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`group w-full
            ${
              message.role === "assistant"
                ? index === lastAssistantIndex
                  ? "mb-24" // Large space after last AI message
                  : "mb-6" // Normal space after other AI messages
                : ""
            }
            animate-in slide-in-from-bottom-4 duration-500`}
          style={{ animationDelay: `${index * 100}ms` }}
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
                  {message.content}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
