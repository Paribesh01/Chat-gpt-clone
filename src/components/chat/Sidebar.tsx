"use client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlobeIcon, SearchIcon } from "lucide-react";
import {
  PlusIcon,
  DotsVerticalIcon,
  ViewVerticalIcon,
  MagnifyingGlassIcon,
  Pencil2Icon,
} from "@radix-ui/react-icons";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

export function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<{ id: string; title: string }[]>([]);
  const router = useRouter();
  const params = useParams();
  const currentChatId = params?.id as string | undefined; // get chat id from URL

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await axios.get("/api/chat");
        const data = res.data;
        setChats(
          data.chats.map((chat: { _id: string; title?: string }) => ({
            id: chat._id,
            title: chat.title || "Untitled Chat",
          }))
        );
      } catch (error) {
        // Optionally handle error
        console.error("Failed to fetch chats", error);
        toast.error("Failed to fetch chats");
      }
    }
    fetchChats();
  }, [params.id]); // <-- add params.id here

  // Only redirect, no API call
  const createNewChat = () => {
    router.push("/chat");
  };

  return (
    <div
      className={`${
        sidebarOpen ? "w-64" : "w-16"
      } h-screen flex flex-col transition-all duration-300 bg-[#171717] border-r border-[#2f2f2f]`}
    >
      {sidebarOpen ? (
        // Make the sidebar a flex column, header/buttons at top, scroll area fills rest
        <div className="flex flex-col h-full">
          {/* Sidebar Header with Logo and Close Button */}
          <div>
            <div className="flex items-center justify-between px-4 py-3 ">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white">
                  <GlobeIcon className="w-5 h-5" />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="text-[#9f9f9f] hover:text-white hover:bg-[#3e3e3e] rounded-full"
              >
                <ViewVerticalIcon className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-2">
              <Button
                onClick={createNewChat}
                className="w-full justify-start gap-3 bg-transparent hover:bg-[#3e3e3e] text-white h-11 rounded-2xl"
              >
                <Pencil2Icon className="w-4 h-4" />
                New chat
              </Button>
            </div>
            <div className="p-2">
              <Button
                onClick={createNewChat}
                className="w-full justify-start gap-3 bg-transparent hover:bg-[#3e3e3e] text-white h-11 rounded-2xl"
              >
                <SearchIcon className="w-4 h-4" />
                Search chat
              </Button>
            </div>
            <div className="px-3 py-2">
              <h3 className="text-xs font-medium text-[#9f9f9f] uppercase tracking-wider mb-2">
                Chats
              </h3>
            </div>
          </div>
          {/* Scrollable chat list */}
          <ScrollArea className="flex-1 min-h-0 px-2">
            <div className="flex flex-col justify-end">
              {chats.length === 0 ? (
                <div className="text-center text-[#9f9f9f] mb-4">No chat</div>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        router.push(`/chat/${chat.id}`);
                      }}
                      className={`w-full text-left p-3 rounded-lg hover:bg-[#3e3e3e] transition-colors group relative ${
                        currentChatId === chat.id ? "bg-[#3e3e3e]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="truncate text-sm text-[#ececf1]">
                          {chat.title}
                        </span>
                      </div>
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-[#565656] rounded">
                        <DotsVerticalIcon className="w-3 h-3" />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        // Collapsed Sidebar (clickable area, content at the top)
        <div
          className="flex flex-col items-center pt-4 gap-4 w-full h-full"
          style={{ cursor: "pointer" }}
          onClick={() => setSidebarOpen(true)}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2">
            <GlobeIcon className="w-5 h-5" />
          </div>
          <Button
            onClick={createNewChat}
            className="w-12 h-12 bg-transparent hover:bg-[#3e3e3e] text-white rounded-xl p-0 flex items-center justify-center"
            title="New chat"
            tabIndex={-1}
          >
            <PlusIcon className="w-5 h-5" />
          </Button>
          <Button
            className="w-12 h-12 bg-transparent hover:bg-[#3e3e3e] text-white rounded-xl p-0 flex items-center justify-center"
            title="Search chats"
            tabIndex={-1}
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
