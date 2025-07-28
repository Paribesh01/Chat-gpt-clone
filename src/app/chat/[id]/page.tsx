"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ModelName } from "@/lib/token-manager";
import { toast } from "sonner";

import axios from "axios";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  url: string;
  extractedText?: string;
}

export default function ChatIdPage() {
  const { id } = useParams();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelName>("gpt-4o");
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Add this state
  const [pendingDraft, setPendingDraft] = useState<null | {
    message: string;
    files: UploadedFile[];
    model: ModelName;
  }>(null);

  // Function to fetch messages for this chat
  const fetchMessages = useCallback(async () => {
    try {
      console.log("Fetching messages for chat:", id);
      const res = await axios.get(`/api/chat/${id}`);
      console.log("Received messages:", res.data.messages);

      // Convert messages to the format expected by useChat
      const formattedMessages = res.data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        files: msg.files || [], // Include files in the formatted messages
      }));

      setInitialMessages(formattedMessages);
      setIsInitialized(true);
      return formattedMessages;
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast.error("Failed to fetch messages");
      setIsInitialized(true);
      return [];
    }
  }, [id]);

  // Fetch initial messages for this chat
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // useChat hook with streaming support
  const {
    messages,
    input,
    handleInputChange,
    isLoading,
    setMessages,
    append,
    setInput,
    reload,
  } = useChat({
    api: `/api/chat/${id}`,
    initialMessages: initialMessages,
    body: {
      model: selectedModel,
      files: uploadedFiles.map((file) => ({
        ...file,
        extractedText: file.extractedText || "",
      })),
    },

    onResponse: (response) => {
      console.log("Response received:", response);
    },
    onFinish: async (message) => {
      console.log("Streaming finished:", message);

      // Clear uploaded files after successful send
      setUploadedFiles([]);

      // Fetch the chat again to ensure consistency
      try {
        const updatedMessages = await fetchMessages();
        if (updatedMessages.length > 0) {
          setMessages(updatedMessages);
        }
      } catch (error) {
        console.error("Failed to refresh messages after streaming:", error);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error("Chat error occurred");
    },
  });

  // Update body when model or files change
  useEffect(() => {
    // This will be handled by the body prop in useChat
  }, [selectedModel, uploadedFiles]);

  // On first load, check for chatDraft and send if present
  useEffect(() => {
    if (!isInitialized) return;

    const draft = localStorage.getItem("chatDraft");

    if (draft) {
      try {
        const { message, files, model } = JSON.parse(draft);
        if (message || (files && files.length > 0)) {
          if (model && model !== selectedModel) {
            setSelectedModel(model);
          }
          if (files && files.length > 0) {
            setPendingDraft({ message, files, model: model || selectedModel });
            setUploadedFiles(files); // Set files first!
          } else {
            append({
              role: "user",
              content: message,
            });
          }
        }
      } catch (e) {
        // ignore parse errors
      }
      localStorage.removeItem("chatDraft");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  useEffect(() => {
    if (pendingDraft && uploadedFiles.length > 0) {
      append({
        role: "user",
        content: pendingDraft.message,
      });
      setPendingDraft(null); // Clear the pending draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFiles, pendingDraft]);

  const handleSendMessage = () => {
    if (!input.trim() && uploadedFiles.length === 0) return;

    // Create the message with files included
    const messageWithFiles = {
      role: "user" as const,
      content: input,
      files: uploadedFiles, // Include files in the message
    };

    append(messageWithFiles);

    // Clear uploaded files after initiating the API call
    setInput("");
  };

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file]);
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleModelChange = (model: ModelName) => {
    setSelectedModel(model);
  };

  const handleEditMessage = async (
    messageId: string,
    newContent: string,
    files: UploadedFile[] = []
  ) => {
    setIsEditing(true);

    // Find the message to edit
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);

    // Optimistically update the UI: update the edited message and remove all messages after it
    if (messageIndex !== -1) {
      const updatedMessages = messages
        .slice(0, messageIndex + 1)
        .map((msg, idx) =>
          idx === messageIndex ? { ...msg, content: newContent, files } : msg
        );
      setMessages(updatedMessages);

      try {
        await reload({
          body: {
            isEdit: true,
            messageId,
            newContent,
            files,
            model: selectedModel,
            messages: updatedMessages,
          },
        });
      } catch (error) {
        console.error("Failed to edit message:", error);
        toast.error("Failed to edit message");
      } finally {
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  // Ref for the bottom of the message list
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Don't render until initial messages are loaded
  if (!isInitialized) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-[#212121] text-white items-center justify-center">
        <div className="text-lg">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#212121] text-white">
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          onEdit={handleEditMessage}
          loading={isLoading}
        />
        {/* Dummy div for scrolling */}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 shrink-0 bg-[#212121]">
        <ChatInput
          inputValue={input}
          setInputValue={handleInputChange}
          onSend={handleSendMessage}
          disabled={isLoading || isEditing}
          loading={isLoading}
          onFileUpload={handleFileUpload}
          uploadedFiles={uploadedFiles}
          onRemoveFile={handleRemoveFile}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
        />
      </div>
    </div>
  );
}
