"use client";
import { PenIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "../ui/textarea";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  files?: {
    id: string;
    name: string;
    type: string;
  }[];
}

interface MessageListProps {
  messages: Message[];
  onEdit: (id: string, content: string) => void;
  loading?: boolean;
}

export function MessageList({
  messages,
  onEdit,
  loading = false,
}: MessageListProps) {
  console.log("^^^^^", messages);

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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

  // Typing dots animation state for loading indicator
  const typingDots = [".", "..", "...", "....", "...", "..", "."];
  const [dotIndex, setDotIndex] = useState(0);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setDotIndex((prev) => (prev + 1) % typingDots.length);
      }, 350);
      return () => clearInterval(interval);
    } else {
      setDotIndex(0);
    }
  }, [loading]);

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return "📸";
    if (type.includes("pdf")) return "📄";
    if (type.includes("doc") || type.includes("docx")) return "📝";
    if (type.includes("xls") || type.includes("xlsx")) return "📊";
    if (type.includes("zip") || type.includes("rar")) return "📦";
    if (type.includes("mp3") || type.includes("wav")) return "🎵";
    if (type.includes("mp4") || type.includes("avi")) return "🎬";
    return "📄"; // Default icon
  };

  return (
    <div className={`${editingId ? "w-full" : "max-w-4xl mx-auto"} pb-32`}>
      {messages.map((message, index) => {
        const isTyping =
          message.role === "assistant" &&
          index === lastAssistantIndex &&
          lastAssistantId === prevAssistantId.current;
        const isEditing = editingId === message.id;
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
              className={`flex gap-4 p-6 ${
                isEditing ? "w-full" : "max-w-4xl mx-auto"
              } ${
                isEditing
                  ? ""
                  : message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`flex-1 space-y-2 ${
                  isEditing ? "w-full" : "max-w-[70%]"
                } ${
                  isEditing
                    ? ""
                    : message.role === "user"
                    ? "flex flex-col items-end"
                    : ""
                }`}
              >
                <div
                  className={`prose prose-invert ${
                    isEditing ? "max-w-lg mx-auto" : "max-w-none"
                  } ${
                    message.role === "user"
                      ? "bg-[#2f2f2f] rounded-2xl px-4 py-3"
                      : ""
                  }`}
                >
                  {message.files && message.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {message.files.map((file) => (
                        <span
                          key={file.id}
                          className="bg-gray-800 text-gray-300 px-2 py-1 rounded-md text-sm"
                        >
                          {getFileIcon(file.type)} {file.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {isEditing ? (
                    <div className="w-full max-w-lg mx-auto">
                      {" "}
                      {/* Ensure parent is wide */}
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full text-white p-2 rounded"
                      />
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => {
                            onEdit(message.id, editValue);
                            setEditingId(null);
                          }}
                          className="rounded-xl text-black bg-white border border-white px-3 py-1 transition-colors duration-150 hover:bg-gray-200 hover:border-gray-300"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-[#212121] hover:bg-[#3e3e3e] rounded-xl text-white border border-[#565656] px-3 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>
                {/* Show Edit button for user messages, below and outside the message box */}
                {editingId !== message.id && message.role === "user" && (
                  <div className="flex items-center mt-2 ml-4 relative group">
                    <button
                      onClick={() => {
                        setEditingId(message.id);
                        setEditValue(message.content);
                      }}
                      className="flex items-center text-xs cursor-pointer bg-transparent hover:bg-[#3e3e3e] rounded-xl px-2 py-1 transition-colors duration-150"
                    >
                      <PenIcon className="w-4 h-4 mr-1" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {loading && (
        <div className="flex gap-4 p-6 max-w-4xl mx-auto">
          <div className="flex-1 space-y-2 max-w-[70%]">
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap leading-relaxed text-[#ececf1]">
                <span className="font-mono animate-pulse">
                  typing {typingDots[dotIndex]}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
