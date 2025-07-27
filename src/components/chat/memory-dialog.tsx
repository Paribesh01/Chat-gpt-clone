"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrashIcon, Cross2Icon } from "@radix-ui/react-icons";
import axios from "axios";
import { toast } from "sonner";

interface Memory {
  id: string;
  content: string;
}

interface MemoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemoryDialog({ isOpen, onClose }: MemoryDialogProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch memories when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    axios
      .get("/api/memory")
      .then((res) => setMemories(res.data.memories || []))
      .catch(() => {
        setMemories([]);
        toast.error("Failed to fetch memories");
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleDeleteMemory = async (id: string) => {
    try {
      await axios.delete(`/api/memory/${id}`);
      setMemories((prev) => prev.filter((memory) => memory.id !== id));
    } catch (err) {
      console.log(err);
      toast.error("Failed to delete memory");
    }
  };

  const handleDeleteAll = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete all memories? This action cannot be undone."
      )
    ) {
      try {
        await axios.delete("/api/memory");
        setMemories([]);
      } catch (err) {
        console.log(err);
        toast.error("Failed to delete all memories");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#171717] border border-[#2f2f2f] rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2f2f2f]">
          <h2 className="text-xl font-semibold text-[#ececf1]">Memory</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-[#9f9f9f] hover:text-[#ececf1] hover:bg-[#3e3e3e] rounded-xl"
          >
            <Cross2Icon className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#ececf1]">Loading...</div>
          ) : memories.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-[#ececf1] mb-2">
                No memories stored
              </h3>
              <p className="text-[#9f9f9f]">
                Start chatting with ChatGPT to build your memory.
              </p>
            </div>
          ) : (
            <div className="relative h-full">
              <div className="p-6 pb-16">
                <div className="border border-[#2f2f2f] rounded-xl overflow-hidden">
                  <ScrollArea className="h-[400px]">
                    <table className="w-full">
                      <tbody className="divide-y divide-[#2f2f2f]">
                        {memories.map((memory) => (
                          <tr
                            key={memory.id}
                            className="hover:bg-[#2f2f2f] transition-colors group last:border-b last:border-[#2f2f2f]"
                          >
                            <td className="py-2 px-4">
                              <p className="text-sm text-[#ececf1] leading-relaxed">
                                {memory.content}
                              </p>
                            </td>
                            <td className="py-2 px-4 text-right w-12">
                              <Button
                                onClick={() => handleDeleteMemory(memory.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-xl"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              </div>

              {/* Delete All Button - Bottom Right */}
              <div className="absolute bottom-4 right-6">
                <Button
                  onClick={handleDeleteAll}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-red-400 border-red-800 hover:bg-red-900/20 bg-transparent text-xs"
                >
                  Delete All
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
