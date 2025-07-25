"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";

import { Sidebar } from "@/components/chat/Sidebar";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  lastMessage: Date;
}

export default function ChatGPTPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentChatId, setCurrentChatId] = useState("1");
  const [inputValue, setInputValue] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      title: "React Components Help",
      messages: [
        {
          id: "1",
          role: "user",
          content: "How do I create a reusable button component in React?",
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant",
          content:
            'To create a reusable button component in React, you can define a functional component that accepts props for customization. Here\'s a basic example:\n\n```jsx\nfunction Button({ children, onClick, variant = "primary", disabled = false }) {\n  const baseClasses = "px-4 py-2 rounded font-medium transition-colors";\n  const variantClasses = {\n    primary: "bg-blue-500 text-white hover:bg-blue-600",\n    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300"\n  };\n\n  return (\n    <button\n      className={`${baseClasses} ${variantClasses[variant]}`}\n      onClick={onClick}\n      disabled={disabled}\n    >\n      {children}\n    </button>\n  );\n}\n```\n\nThis component accepts children (button text), an onClick handler, a variant prop for styling, and a disabled prop. You can extend it further by adding more variants, sizes, or other props as needed.',
          timestamp: new Date(),
        },
        {
          id: "3",
          role: "user",
          content:
            "Can you show me how to add TypeScript support to this component?",
          timestamp: new Date(),
        },
        {
          id: "4",
          role: "assistant",
          content:
            'Here\'s how you can add TypeScript support to the button component:\n\n```tsx\nimport React from "react";\n\ninterface ButtonProps {\n  children: React.ReactNode;\n  onClick?: () => void;\n  variant?: "primary" | "secondary";\n  disabled?: boolean;\n  className?: string;\n}\n\nconst Button: React.FC<ButtonProps> = ({ \n  children, \n  onClick, \n  variant = "primary", \n  disabled = false,\n  className = ""\n}) => {\n  const baseClasses = "px-4 py-2 rounded font-medium transition-colors";\n  const variantClasses = {\n    primary: "bg-blue-500 text-white hover:bg-blue-600",\n    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300"\n  };\n\n  return (\n    <button\n      className={`${baseClasses} ${variantClasses[variant]} ${className}`}\n      onClick={onClick}\n      disabled={disabled}\n    >\n      {children}\n    </button>\n  );\n};\n\nexport default Button;\n```\n\nKey TypeScript additions:\n- `ButtonProps` interface defines the component\'s props\n- `React.FC<ButtonProps>` specifies the component type\n- `React.ReactNode` for children prop\n- Union types for variant prop\n- Optional props marked with `?`',
          timestamp: new Date(),
        },
      ],
      lastMessage: new Date(),
    },
    {
      id: "2",
      title: "JavaScript Array Methods",
      messages: [
        {
          id: "5",
          role: "user",
          content: "What are the most useful JavaScript array methods?",
          timestamp: new Date(Date.now() - 86400000),
        },
        {
          id: "6",
          role: "assistant",
          content:
            "Here are the most useful JavaScript array methods:\n\n**Transformation Methods:**\n- `map()` - Transform each element\n- `filter()` - Filter elements based on condition\n- `reduce()` - Reduce array to single value\n\n**Search Methods:**\n- `find()` - Find first matching element\n- `findIndex()` - Find index of first match\n- `includes()` - Check if element exists\n\n**Iteration Methods:**\n- `forEach()` - Execute function for each element\n- `some()` - Test if any element passes condition\n- `every()` - Test if all elements pass condition\n\nThese methods are essential for functional programming in JavaScript!",
          timestamp: new Date(Date.now() - 86400000),
        },
      ],
      lastMessage: new Date(Date.now() - 86400000),
    },
    {
      id: "3",
      title: "CSS Grid Layout",
      messages: [
        {
          id: "7",
          role: "user",
          content: "How do I create a responsive grid layout with CSS Grid?",
          timestamp: new Date(Date.now() - 172800000),
        },
      ],
      lastMessage: new Date(Date.now() - 172800000),
    },
    {
      id: "4",
      title: "API Integration Best Practices",
      messages: [],
      lastMessage: new Date(Date.now() - 259200000),
    },
    {
      id: "5",
      title: "Python Data Analysis",
      messages: [],
      lastMessage: new Date(Date.now() - 345600000),
    },
  ]);

  const currentChat = chats.find((chat) => chat.id === currentChatId);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Start transition animation if this is the first message
    if (currentChat?.messages.length === 0) {
      setIsTransitioning(true);

      // Add the message after a short delay to allow the animation to start
      setTimeout(() => {
        const newMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: inputValue,
          timestamp: new Date(),
        };

        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === currentChatId
              ? { ...chat, messages: [...chat.messages, newMessage] }
              : chat
          )
        );

        setInputValue("");

        // Simulate assistant response
        setTimeout(() => {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "I understand your question. Let me help you with that...",
            timestamp: new Date(),
          };

          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.id === currentChatId
                ? { ...chat, messages: [...chat.messages, assistantMessage] }
                : chat
            )
          );
        }, 1000);
      }, 300);
    } else {
      // Normal message sending for existing chats
      const newMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: inputValue,
        timestamp: new Date(),
      };

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, newMessage] }
            : chat
        )
      );

      setInputValue("");

      // Simulate assistant response
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I understand your question. Let me help you with that...",
          timestamp: new Date(),
        };

        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === currentChatId
              ? { ...chat, messages: [...chat.messages, assistantMessage] }
              : chat
          )
        );
      }, 1000);
    }
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      lastMessage: new Date(),
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setIsTransitioning(false);
  };

  const handleSubmit = () => {
    handleSendMessage();
  };

  // Reset transition state when switching to a chat with messages
  useEffect(() => {
    if (currentChat?.messages?.length! > 0) {
      setIsTransitioning(false);
    }
  }, [currentChatId, currentChat?.messages.length]);

  const lastAssistantIndex = currentChat?.messages
    .map((m, i) => (m.role === "assistant" ? i : -1))
    .filter((i) => i !== -1)
    .pop();

  return (
    <div className="flex h-screen bg-[#212121] text-white">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        chats={chats}
        r
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        createNewChat={createNewChat}
      />
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}

        {/* Chat Area */}
        {currentChat?.messages.length! > 0 || isTransitioning ? (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <MessageList messages={currentChat?.messages || []} />
            </ScrollArea>
            <ChatInput
              inputValue={inputValue}
              setInputValue={setInputValue}
              onSend={handleSendMessage}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <h2 className="mb-8 text-2xl font-semibold text-[#ececf1]">
              What's today’s agenda?
            </h2>
            <ChatInput
              inputValue={inputValue}
              setInputValue={setInputValue}
              onSend={handleSendMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
