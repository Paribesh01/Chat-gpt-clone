"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ModelName } from "@/lib/token-manager";

import axios from "axios";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  url: string;
  extractedText?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date; // Make timestamp optional
  files?: UploadedFile[];
}

export default function ChatIdPage() {
  const { id } = useParams();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelName>("gpt-4o");
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Add this state

  // Fetch initial messages for this chat
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        console.log("Fetching messages for chat:", id);
        const res = await axios.get(`/api/chat/${id}`);
        console.log("Received messages:", res.data.messages);

        // Convert messages to the format expected by useChat
        const formattedMessages = res.data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          // Add any additional properties you need
        }));

        setInitialMessages(formattedMessages);
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        setIsInitialized(true);
      }
    };
    fetchMessages();
  }, [id]);

  // useChat hook with streaming support
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
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
    onFinish: (message) => {
      console.log("Streaming finished:", message);
      // Clear uploaded files after successful send
      setUploadedFiles([]);
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  // Update body when model or files change
  useEffect(() => {
    // This will be handled by the body prop in useChat
  }, [selectedModel, uploadedFiles]);

  const handleSendMessage = () => {
    if (!input.trim() && uploadedFiles.length === 0) return;

    // Create FormData to include files
    const formData = new FormData();
    formData.append("message", input);
    formData.append("model", selectedModel);

    // Add files to form data if any
    if (uploadedFiles.length > 0) {
      formData.append(
        "files",
        JSON.stringify(
          uploadedFiles.map((file) => ({
            ...file,
            extractedText: file.extractedText || "",
          }))
        )
      );
    }

    handleSubmit(formData);
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

  const handleEditMessage = (messageId: string, newContent: string) => {
    // Find the message to edit
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);

    if (messageIndex !== -1) {
      setIsEditing(true); // Disable input while editing

      // Optimistically update the UI - update the message AND remove all subsequent messages
      const updatedMessages = messages.slice(0, messageIndex + 1); // Keep only up to the edited message
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: newContent,
      };
      setMessages(updatedMessages);

      // Call the API to update the message
      axios
        .patch(`/api/chat/${id}/message/${messageId}`, {
          newContent,
          model: selectedModel,
        })
        .then((res) => {
          // Update with server response
          const serverMessages = res.data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
          }));
          setMessages(serverMessages);
        })
        .catch((error) => {
          console.error("Failed to edit message:", error);
          // Optionally revert the optimistic update
        })
        .finally(() => {
          setIsEditing(false); // Re-enable input after editing is complete
        });
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
          disabled={isLoading || isEditing} // Disable when loading OR editing
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
