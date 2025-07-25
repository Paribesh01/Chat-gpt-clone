import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { Button } from "../ui/button";

export const ChatHeader = () => {
  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-[#2f2f2f]">
        <div className="flex items-center gap-3">
          <h1 className="text-xl text-[#ececf1]">ChatGPT</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-2xl text-black bg-white border-white"
          >
            Log in
          </Button>
          <Button className="bg-[#212121] hover:bg-[#3e3e3e] rounded-2xl text-white border border-[#565656]">
            Sign up for free
          </Button>
          <QuestionMarkCircledIcon className="ml-2 w-6 h-6" />
        </div>
      </div>
    </>
  );
};
