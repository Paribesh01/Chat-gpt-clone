"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ReaderIcon,
  Pencil1Icon,
  MagnifyingGlassIcon,
  LightningBoltIcon,
  CodeIcon,
  ChatBubbleIcon,
  QuestionMarkCircledIcon,
  ArrowUpIcon,
} from "@radix-ui/react-icons";
import { GlobeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export default function LandingPage() {
  const [inputValue, setInputValue] = useState("");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const { isSignedIn } = useUser();

  const router = useRouter();

  const requireLogin = (action?: () => void) => {
    if (!isSignedIn) {
      toast.error("Please log in first");
      return;
    }
    action?.();
  };

  const suggestions = [
    {
      icon: <ReaderIcon className="w-4 h-4" style={{ color: "#19c37d" }} />,
      title: "Summarize",
      description: "Condense long text into key points",
    },
    {
      icon: <Pencil1Icon className="w-4 h-4" style={{ color: "#eab308" }} />,
      title: "Write",
      description: "Create content, emails, or essays",
    },
    {
      icon: (
        <MagnifyingGlassIcon className="w-4 h-4" style={{ color: "#f43f5e" }} />
      ),
      title: "Analyze",
      description: "Break down complex topics",
    },
    {
      icon: (
        <LightningBoltIcon className="w-4 h-4" style={{ color: "#3b82f6" }} />
      ),
      title: "Explain",
      description: "Make difficult concepts simple",
    },
    {
      icon: <CodeIcon className="w-4 h-4" style={{ color: "#a21caf" }} />,
      title: "Code",
      description: "Write and debug programming code",
    },
    {
      icon: <ChatBubbleIcon className="w-4 h-4" style={{ color: "#f97316" }} />,
      title: "Chat",
      description: "Have a conversation about anything",
    },
  ];

  const handleSuggestionClick = (title: string) => {
    setInputValue(`${title}: `);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
  };

  return (
    <div className="min-h-screen bg-[#212121] text-white flex flex-col">
      {/* Header */}
      <header className=" p-4">
        <div className=" mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl  text-[#ececf1]">ChatGPT</h1>
          </div>
          <div className="flex items-center gap-3">
            {!isSignedIn && (
              <Button
                className="rounded-2xl text-black !bg-white hover:!bg-gray-300 cursor-pointer"
                onClick={() => router.push("/sign-in")}
              >
                Log in
              </Button>
            )}
            <Button
              className="bg-[#212121] cursor-pointer hover:bg-[#3e3e3e] rounded-2xl text-white border border-[#565656]"
              onClick={() => router.push("/sign-up")}
            >
              Sign up for free
            </Button>
            <QuestionMarkCircledIcon className=" ml-2 w-6 h-6" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-[#ececf1] mb-8">
              ChatGPT
            </h2>
          </div>

          {/* Input Section */}
          <div className="mb-6">
            {/* Add a relative container for the input and buttons */}
            <div className="relative w-5/6 mx-auto">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask anything"
                className="w-full bg-[#2f2f2f] text-[#ececf1] placeholder-[#b8b8cd] pl-5 pr-14 py-4 min-h-[100px] text-x rounded-3xl resize-none shadow-md "
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    requireLogin(handleSubmit);
                  }
                }}
              />

              {/* Bottom buttons row */}
              <div className="absolute bottom-3 left-3 right-14 flex items-center gap-2">
                <Button
                  variant="outline" // changed from "ghost" to "outline"
                  size="sm"
                  className="rounded-2xl text-white bg-transparent p-2 h-8 flex items-center gap-1 border border-[#565656]"
                  onClick={() => requireLogin()}
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
                  className="rounded-2xl  text-white bg-transparent p-2 h-8 flex items-center gap-1 border border-[#565656]"
                  onClick={() => requireLogin()}
                >
                  <GlobeIcon className="w-4 h-4" />
                  <span>Search</span>
                </Button>
              </div>

              <Button
                onClick={() => requireLogin(handleSubmit)}
                disabled={!inputValue.trim()}
                size="sm"
                className="absolute right-3 bottom-3  bg-[#ececf1] hover:bg-white disabled:bg-[#4f4f4f] disabled:opacity-50 rounded-full p-2 text-black"
              >
                <ArrowUpIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Suggestion Buttons */}
          <div className="flex flex-wrap justify-center gap-3 max-w-5/6 mx-auto mb-8">
            {(showAllSuggestions ? suggestions : suggestions.slice(0, 4)).map(
              (suggestion, index) => (
                <Button
                  key={index}
                  // DO NOT wrap with requireLogin, just call the original handler
                  onClick={() => handleSuggestionClick(suggestion.title)}
                  className="bg-[#212121] border border-[#565656] hover:bg-[#3e3e3e] text-[#9f9f9f] px-6 py-2 rounded-2xl text-sm font-medium transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div>{suggestion.icon}</div>
                    <span>{suggestion.title}</span>
                  </div>
                </Button>
              )
            )}
            {!showAllSuggestions && (
              <Button
                onClick={() => requireLogin(() => setShowAllSuggestions(true))}
                className="bg-[#212121] border border-[#565656] hover:bg-[#3e3e3e] text-[#9f9f9f]  px-6 py-2 rounded-2xl text-sm font-medium transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>More</span>
                </div>
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className=" p-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-white">
            By messaging ChatGPT, you agree to our{" "}
            <a href="#" className=" underline">
              Terms
            </a>{" "}
            and have read our{" "}
            <a href="#" className=" underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
