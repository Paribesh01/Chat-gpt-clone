"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInput } from "@/components/chat/ChatInput";
import axios from "axios";
import { ModelName } from "@/lib/token-manager";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  url: string;
  extractedText?: string;
}

export default function ChatPage() {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelName>("gpt-4o");
  const router = useRouter();

  const handleSendMessage = async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) return;
    setLoading(true);

    try {
      // Use axios instead of fetch
      const res = await axios.post("/api/chat", {
        message: inputValue,
        files: uploadedFiles.map((file) => ({
          ...file,
          extractedText: file.extractedText || "",
        })),
        model: selectedModel, // Pass the selected model
      });
      const data = res.data;
      if (data.chatId) {
        router.push(`/chat/${data.chatId}`);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file]);

    console.log("Uploaded files:", file);
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleModelChange = (model: ModelName) => {
    setSelectedModel(model);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#212121] text-white">
      <div className="w-full max-w-xl">
        <h2 className="mb-8 text-2xl font-semibold text-[#ececf1] text-center">
          What's today's agenda?
        </h2>
        <ChatInput
          inputValue={inputValue}
          setInputValue={(e) => setInputValue(e.target.value)}
          onSend={handleSendMessage}
          disabled={loading}
          loading={loading}
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
