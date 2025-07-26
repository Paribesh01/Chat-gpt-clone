"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

import axios from "axios";
import { set } from "mongoose";

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
  timestamp: Date;
  files?: UploadedFile[];
}

export default function ChatIdPage() {
  const { id } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Fetch messages for this chat
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        console.log("Fetching messages for chat:", id);
        const res = await axios.get(`/api/chat/${id}`);
        console.log("Received messages:", res.data.messages);
        setMessages(res.data.messages || []);
        console.log("Messages fetched:", messages);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };
    fetchMessages();
  }, [id]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) return;
    setLoading(true);

    // Create a new user message object
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
      files: uploadedFiles, // Include uploaded files in the message
    };

    // Optimistically add the user message to the chat
    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setUploadedFiles([]); // Clear uploaded files after sending

    try {
      const res = await axios.post(`/api/chat/${id}`, {
        message: inputValue,
        files: uploadedFiles.map((file) => ({
          ...file,
          extractedText: file.extractedText || "",
        })), // Ensure files are properly serialized
      });

      // Replace messages with the server's response
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file]);
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    setLoading(true);
    const editedIndex = messages.findIndex((msg) => msg.id === messageId);

    if (editedIndex !== -1) {
      // Optimistically update the UI
      const updatedMessages = [
        ...messages.slice(0, editedIndex),
        {
          ...messages[editedIndex],
          content: newContent,
        },
      ];
      setMessages(updatedMessages);

      // Now call the API in the background
      axios
        .patch(`/api/chat/${id}/message/${messageId}`, { newContent })
        .then((res) => {
          setMessages(res.data.messages || []);
          setLoading(false); // <-- Move here
        })
        .catch((error) => {
          // Optionally, revert or show error
          console.error("Failed to edit message:", error);
          setLoading(false); // <-- And here
        });
    }
  };

  // Ref for the bottom of the message list
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#212121] text-white">
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          onEdit={handleEditMessage}
          loading={loading}
        />
        {/* Dummy div for scrolling */}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 shrink-0 bg-[#212121]">
        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSend={handleSendMessage}
          disabled={loading}
          onFileUpload={handleFileUpload}
          uploadedFiles={uploadedFiles}
          onRemoveFile={handleRemoveFile}
        />
      </div>
    </div>
  );
}
