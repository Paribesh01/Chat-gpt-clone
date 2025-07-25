"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInput } from "@/components/chat/ChatInput";
import axios from "axios"; // Add this import

export default function ChatPage() {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    setLoading(true);

    try {
      // Use axios instead of fetch
      const res = await axios.post("/api/chat", { message: inputValue });
      const data = res.data;
      if (data.chatId) {
        router.push(`/chat/${data.chatId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#212121] text-white">
      <div className="w-full max-w-xl">
        <h2 className="mb-8 text-2xl font-semibold text-[#ececf1] text-center">
          What's today’s agenda?
        </h2>
        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSend={handleSendMessage}
          disabled={loading}
          loading={loading} // Pass loading state
        />
      </div>
    </div>
  );
}
