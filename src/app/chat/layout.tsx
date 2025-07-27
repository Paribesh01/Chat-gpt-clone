import { Sidebar } from "@/components/chat/Sidebar";
import { ChatHeader } from "@/components/chat/chat-header";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-row h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col ">
        <ChatHeader />
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
