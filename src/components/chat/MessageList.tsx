"use client";
import { PenIcon } from "lucide-react";
import { useState } from "react";
import { Textarea } from "../ui/textarea";
import type { Message } from "ai";
import { AIResponse } from "../ui/kibo-ui/ai/response";
import Loading from "../loading";
import Image from "next/image";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  url: string;
  extractedText?: string;
}

interface MessageListProps {
  messages: Message[];
  onEdit: (id: string, content: string, files: UploadedFile[]) => void;
  loading?: boolean;
}

export function MessageList({ messages, onEdit, loading }: MessageListProps) {
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

  const renderFileDisplay = (files: UploadedFile[]) => {
    if (!files || files.length === 0) return null;

    return (
      <div className="space-y-2">
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-2 p-2  rounded  ">
            {/* Only show icon if not an image */}
            {!file.type.includes("image") && (
              <span className="text-sm">{getFileIcon(file.type)}</span>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{file.name}</div>
              {/* Show image preview if file is an image */}
              {file.type.includes("image") && (
                <Image
                  src={file.url}
                  alt={file.name}
                  width={600} // or any preferred width
                  height={400} // or any preferred height
                  className="mt-2 rounded"
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`${editingId ? "w-full" : "max-w-3xl mx-auto"} pb-32`}>
      {messages.map((message, index) => {
        const isEditing = editingId === message.id;
        // Cast message to include files property
        const messageWithFiles = message as Message & {
          files?: UploadedFile[];
        };

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
                  {/* Display files if they exist */}
                  {messageWithFiles.files &&
                    messageWithFiles.files.length > 0 &&
                    renderFileDisplay(messageWithFiles.files)}

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
                            onEdit(
                              message.id,
                              editValue,
                              messageWithFiles.files || []
                            );
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
                      {message.role === "assistant" ? (
                        <AIResponse>{message.content}</AIResponse>
                      ) : (
                        message.content
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

      {/* Loading indicator when AI is responding */}
      {loading && (
        <div className="flex gap-4 p-6 max-w-4xl mx-auto justify-start">
          <div className="flex-1 space-y-2 max-w-[70%]">
            <div className="prose prose-invert max-w-none">
              <div className="flex items-center space-x-2 text-[#ececf1]">
                <Loading />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
