"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpIcon, GlobeIcon } from "@radix-ui/react-icons";
import { XIcon, ChevronDownIcon, SquareIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ModelName } from "@/lib/token-manager";
import { toast } from "sonner";
import Image from "next/image";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  url: string;
  extractedText?: string;
}

interface ChatInputProps {
  inputValue: string;
  setInputValue: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onStop?: () => void; // Add this prop
  disabled?: boolean;
  loading?: boolean;
  onFileUpload?: (file: UploadedFile) => void;
  uploadedFiles?: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
  selectedModel?: ModelName;
  onModelChange?: (model: ModelName) => void;
}

// Available models with display names
const MODEL_OPTIONS: {
  value: ModelName;
  label: string;
  description: string;
}[] = [
  { value: "gpt-4o", label: "GPT-4o", description: "Most capable model" },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    description: "Fast and efficient",
  },
  {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    description: "Balanced performance",
  },
  { value: "gpt-4", label: "GPT-4", description: "Classic GPT-4" },
  {
    value: "gpt-3.5-turbo",
    label: "GPT-3.5 Turbo",
    description: "Fast and cost-effective",
  },
];

export function ChatInput({
  inputValue,
  setInputValue,
  onSend,
  onStop, // Add this prop
  disabled,
  loading,
  onFileUpload,
  uploadedFiles = [],
  onRemoveFile,
  selectedModel = "gpt-4o",
  onModelChange,
}: ChatInputProps) {
  const [uploading, setUploading] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside handler for model dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node)
      ) {
        setModelDropdownOpen(false);
      }
    }

    if (modelDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [modelDropdownOpen]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      // Process all selected files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const result = await response.json();
        const uploadedFile: UploadedFile = {
          id: Date.now().toString() + i, // Ensure unique IDs for multiple files
          name: result.file_name,
          type: result.file_type,
          url: result.secure_url,
          extractedText: result.extracted_text,
        };

        onFileUpload?.(uploadedFile);
      }

      toast.success(
        `Successfully uploaded ${files.length} file${
          files.length > 1 ? "s" : ""
        }`
      );
    } catch (error) {
      console.error("File upload failed:", error);
      toast.error("File upload failed");
    } finally {
      setUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleModelSelect = (model: ModelName) => {
    onModelChange?.(model);
    setModelDropdownOpen(false);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return "🖼️";
    } else if (type === "application/pdf") {
      return "📄";
    } else if (type.includes("word")) {
      return "📝";
    } else if (type.includes("text/")) {
      return "📄";
    }
    return "📎";
  };

  const selectedModelOption = MODEL_OPTIONS.find(
    (option) => option.value === selectedModel
  );

  return (
    <div className="w-full max-w-3xl  mx-auto ">
      <div className="rounded-3xl bg-[#2f2f2f] border-0">
        {/* Uploaded files row ABOVE textarea */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 py-2 bg-[#2f2f2f] rounded-t-3xl">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 bg-[#3f3f3f] rounded-md px-2 py-1 border border-[#565656] max-w-[200px]"
                style={{ minWidth: 0 }}
              >
                {/* Only show icon if not an image */}
                {!file.type.startsWith("image/") && (
                  <div className="w-8 h-8 bg-[#4f4f4f] rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-base leading-none">
                      {getFileIcon(file.type)}
                    </span>
                  </div>
                )}
                <span className="text-xs text-white truncate flex-1 min-w-0">
                  {file.name}
                </span>
                {/* Image preview using Next.js Image */}
                {file.type.startsWith("image/") && (
                  <Image
                    src={file.url}
                    alt={file.name}
                    width={60}
                    height={48}
                    className="ml-2 rounded max-h-12 max-w-[60px] object-contain"
                    style={{ background: "#222" }}
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile?.(file.id)}
                  className="text-gray-400 hover:text-white p-0 h-4 w-4 ml-1 flex-shrink-0"
                >
                  <XIcon className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e)}
          placeholder="Ask anything"
          className="w-full !bg-[#2f2f2f] text-[#ececf1] placeholder-[#b8b8cd] pl-5 pr-14 py-4 resize-none border-0 overflow-y-auto min-h-[60px] max-h-[300px] rounded-t-3xl"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              inputValue.trim() // Only send if there is text
            ) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={disabled}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
        />

        {/* Bottom buttons row */}
        <div className="flex items-center gap-2 px-3 py-3 bg-[#2f2f2f] rounded-b-3xl">
          <Button
            variant="outline"
            size="sm"
            className="rounded-2xl text-white bg-transparent p-2 h-8 flex items-center gap-1 border border-[#565656]"
            onClick={handleAttachClick}
            disabled={uploading}
          >
            {uploading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            )}
            <span>{uploading ? "Uploading..." : "Attach"}</span>
          </Button>

          {/* Model Selector */}
          <div className="relative" ref={modelDropdownRef}>
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl text-white bg-transparent p-2 h-8 flex items-center gap-1 border border-[#565656]"
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            >
              <span className="text-xs">{selectedModelOption?.label}</span>
              <ChevronDownIcon className="w-3 h-3" />
            </Button>

            {modelDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#3f3f3f] border border-[#565656] rounded-lg shadow-lg z-50">
                <div className="p-2">
                  {MODEL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleModelSelect(option.value)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-[#4f4f4f] transition-colors ${
                        selectedModel === option.value
                          ? "bg-[#4f4f4f] text-white"
                          : "text-gray-300"
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-400">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-2xl text-white bg-transparent p-2 h-8 flex items-center gap-1 border border-[#565656]"
          >
            <GlobeIcon className="w-4 h-4" />
            <span>Search</span>
          </Button>
          {/* Send/Stop button */}
          {loading ? (
            <Button
              onClick={onStop}
              size="sm"
              className="rounded-2xl text-white hover:text-white bg-transparent hover:bg-[#3f3f3f] p-2 h-8 flex items-center gap-1 border border-[#565656] ml-auto"
            >
              <SquareIcon className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={onSend}
              disabled={
                uploading || disabled || !inputValue.trim() // Only enable if there is text
              }
              size="sm"
              className="rounded-2xl text-white hover:text-white bg-transparent hover:bg-[#3f3f3f] p-2 h-8 flex items-center gap-1 border border-[#565656] ml-auto"
            >
              <ArrowUpIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-white text-center mt-3">
        By messaging ChatGPT, you agree to our{" "}
        <a href="#" className="underline">
          Terms
        </a>{" "}
        and have read our{" "}
        <a href="#" className="underline">
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
