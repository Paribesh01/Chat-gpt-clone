"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import axios from "axios";

export default function ChatIdPage() {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!inputValue.trim()) return;
    setLoading(true);

    // Create a new user message object
    const newMessage = {
      id: Date.now().toString(), // or use a better unique id if you have one
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    // Optimistically add the user message to the chat
    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    try {
      const res = await axios.post(`/api/chat/${id}`, {
        message: inputValue,
      });

      // Replace messages with the server's response (which should include the assistant's reply)
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Optionally, remove the optimistic message or show an error
    } finally {
      setLoading(false);
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
        <MessageList messages={messages} />
        {/* Dummy div for scrolling */}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 shrink-0 bg-[#212121]">
        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSend={handleSendMessage}
          disabled={loading}
        />
      </div>
    </div>
  );
}
