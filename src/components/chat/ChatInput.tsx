// src/components/ChatInput.tsx
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpIcon, GlobeIcon } from "@radix-ui/react-icons";

interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  onSend: () => void;
  disabled?: boolean;
  loading?: boolean; // Add loading prop
}

export function ChatInput({
  inputValue,
  setInputValue,
  onSend,
  disabled,
  loading, // Destructure loading
}: ChatInputProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask anything"
          className="w-full bg-[#2f2f2f] text-[#ececf1] placeholder-[#b8b8cd] pl-5 pr-14 py-4 min-h-[100px] rounded-3xl resize-none shadow-md border-0 "
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={disabled}
        />

        {/* Bottom buttons row */}
        <div className="absolute bottom-3 left-3 right-14 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-2xl text-white bg-transparent p-2 h-8 flex items-center gap-1 border border-[#565656]"
          >
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
            <span>Attach</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-2xl text-white bg-transparent p-2 h-8 flex items-center gap-1 border border-[#565656]"
          >
            <GlobeIcon className="w-4 h-4" />
            <span>Search</span>
          </Button>
        </div>

        <Button
          onClick={onSend}
          disabled={disabled || !inputValue.trim()}
          size="sm"
          className="absolute right-3 bottom-3 bg-[#ececf1] hover:bg-white disabled:bg-[#4f4f4f] disabled:opacity-50 rounded-full p-2 text-black"
        >
          {loading ? (
            // Spinner SVG
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
            <ArrowUpIcon className="w-4 h-4" />
          )}
        </Button>
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
