import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Chat from "@/model/chat";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { auth } from "@clerk/nextjs/server";
import {
  createTokenManager,
  type Message,
  type ModelName,
} from "@/lib/token-manager";
import { parseUploadedFiles, type UploadedFile } from "@/lib/chat-utils";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const message = body.message;
    const model: ModelName = body.model || "gpt-4o";
    const files: UploadedFile[] = parseUploadedFiles(body.files);

    const { userId } = await auth();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!message && (!files || files.length === 0)) {
      return new Response(
        JSON.stringify({ error: "No message or files provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate chat title as before

    const titleTokenManager = createTokenManager(model);

    let chatTitle = "New Chat";
    try {
      const titleMessages: Message[] = [
        {
          role: "system",
          content:
            "You are an assistant that generates short, descriptive titles for chat conversations. Respond with only the title, no extra text.",
        },
        {
          role: "user",
          content: `Generate a title for this conversation: "${message}"`,
        },
      ];
      const trimmedTitleMessages =
        titleTokenManager.trimMessages(titleMessages);
      const { text: titleText } = await generateText({
        model: openai(model),
        messages: trimmedTitleMessages,
      });
      chatTitle = titleText.trim();
    } catch (titleErr) {
      console.error("Error generating title:", titleErr);
      // fallback to default
    }

    // Only create the chat, do not save message or generate AI response
    const chat = await Chat.create({ userId, title: chatTitle });

    return new Response(JSON.stringify({ chatId: chat._id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Get userId from Clerk
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const chats = await Chat.find({ userId }).sort({ createdAt: -1 }).lean();

    return new Response(JSON.stringify({ chats }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
