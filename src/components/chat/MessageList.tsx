"use client";
import { PenIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Textarea } from "../ui/textarea";
import type { Message } from "ai";

// interface Message {
//   id: string;
//   role: "user" | "assistant";
//   content: string;
//   timestamp: Date;
//   files?: {
//     id: string;
//     name: string;
//     type: string;
//   }[];
// }

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

  // Remove typing effect state and logic
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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
        const isEditing = editingId === message.id;
        return (
          <div
            key={message.id}
            className={`group w-full
              ${
                message.role === "assistant"
                  ? index === messages.length - 1
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
                      {message.content}
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
    </div>
  );
}
