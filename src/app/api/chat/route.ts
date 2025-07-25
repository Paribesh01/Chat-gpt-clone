import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Chat from "@/model/chat";
import Message from "@/model/message";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { auth } from "@clerk/nextjs/server";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("AI request timed out")), ms)
    ),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/chat called");

    await dbConnect();
    console.log("Database connected");

    const { message } = await req.json();
    console.log("Request JSON parsed:", message);

    // Get userId from Clerk
    const { userId } = await auth();
    console.log("Auth checked, userId:", userId);

    if (!userId) {
      console.log("No userId found, unauthorized");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!message) {
      console.log("No message provided in request");
      return new Response(JSON.stringify({ error: "No message provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Create chat with userId
    const chat = await Chat.create({ userId });
    console.log("Chat created:", chat._id);

    // 2. Save user message
    const userMsg = await Message.create({
      chat: chat._id,
      content: message,
      role: "user",
    });
    console.log("User message saved:", userMsg._id);

    // 3. Get AI response with context
    console.log("About to call generateText");
    let aiText;
    try {
      const { text } = await withTimeout(
        generateText({
          model: openai("gpt-4o"),
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant, similar to ChatGPT. Answer user questions clearly and concisely.",
            },
            { role: "user", content: message },
          ],
        }),
        10000 // 10 seconds timeout
      );
      aiText = text;
      console.log("AI response received");
    } catch (aiErr) {
      console.error("Error during generateText:", aiErr);
      throw aiErr; // rethrow to be caught by outer catch
    }

    // 4. Save assistant message
    const assistantMsg = await Message.create({
      chat: chat._id,
      content: aiText,
      role: "assistant",
    });
    console.log("Assistant message saved:", assistantMsg._id);

    // 5. Return chat id and messages
    console.log("Returning response with chatId:", chat._id);
    return new Response(
      JSON.stringify({
        chatId: chat._id,
        messages: [
          {
            id: userMsg._id,
            role: "user",
            content: userMsg.content,
            timestamp: userMsg.createdAt,
          },
          {
            id: assistantMsg._id,
            role: "assistant",
            content: assistantMsg.content,
            timestamp: assistantMsg.createdAt,
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error in POST /api/chat:", err);
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

    const chats = await Chat.find({ userId }).lean();

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
