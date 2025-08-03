"use client";
import {
  QuestionMarkCircledIcon,
  HamburgerMenuIcon,
} from "@radix-ui/react-icons";
import { Button } from "../ui/button";
import { useState } from "react";
import { MemoryDialog } from "./memory-dialog";
import { useUser, SignOutButton } from "@clerk/nextjs";

interface ChatHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const ChatHeader = ({
  sidebarOpen,
  setSidebarOpen,
}: ChatHeaderProps) => {
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <>
      <div className="flex items-center justify-between bg-[#212121] p-4 border-b border-[#2f2f2f]">
        <div className="flex items-center gap-3">
          {/* Hamburger menu for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-[#9f9f9f] hover:text-white hover:bg-[#3e3e3e] rounded-full"
          >
            <HamburgerMenuIcon className="w-5 h-5" />
          </Button>
          <h1 className="text-xl text-[#ececf1]">ChatGPT</h1>
        </div>
        <div className="flex-1 flex justify-center">
          <Button
            onClick={() => setMemoryDialogOpen(true)}
            variant="ghost"
            size="sm"
            className="text-[#ececf1] hover:text-white hover:bg-[#3e3e3e] rounded-xl flex items-center gap-2"
          >
            <span>Memory</span>
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <SignOutButton>
              <Button variant="outline" className="rounded-2xl cursor-pointer">
                Log out
              </Button>
            </SignOutButton>
          ) : (
            <>
              <Button
                variant="outline"
                className="rounded-2xl bg-white hover:bg-white text-black hover:text-black"
              >
                Log in
              </Button>
              <Button className="bg-[#212121] hover:bg-[#3e3e3e] rounded-2xl text-white border border-[#565656]">
                Sign up for free
              </Button>
            </>
          )}
          <QuestionMarkCircledIcon className="ml-2 w-6 h-6" />
        </div>
      </div>
      <MemoryDialog
        isOpen={memoryDialogOpen}
        onClose={() => setMemoryDialogOpen(false)}
      />
    </>
  );
};
