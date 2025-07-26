import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Chat from "@/model/chat";
import Message from "@/model/message";
import { openai } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { getUserMemory, addUserMemory } from "@/lib/mem0";

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    await dbConnect();
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { chatId } = await params;
    const chat = await Chat.findOne({ _id: chatId, userId }).lean();
    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const messages = await Message.find({ chat: chatId })
      .sort({ createdAt: 1 })
      .lean();
    return new Response(
      JSON.stringify({
        messages: messages.map((msg) => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt,
        })),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    console.log("POST /api/chat called");
    const { chatId } = await params;
    await dbConnect();
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { message } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "No message provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Save user message
    const userMsg = await Message.create({
      chat: chat._id,
      content: message,
      role: "user",
    });

    // Get previous messages for context (limit to last 10)
    const prevMessages = await Message.find({ chat: chat._id })
      .sort({ createdAt: 1 })
      .lean();

    // Get user memory for additional context
    let memoryContext = "";
    try {
      const memories = await getUserMemory(userId, message);
      if (memories && memories.length > 0) {
        memoryContext = `\n\nPrevious relevant context:\n${memories.join(
          "\n"
        )}`;
        console.log("Retrieved memory context for user:", userId);
      }
    } catch (memoryErr) {
      console.error("Error retrieving memory:", memoryErr);
      // Continue without memory context
    }

    const aiResult = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant, similar to ChatGPT. Answer user questions clearly and concisely." +
            memoryContext,
        },
        ...prevMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: message },
      ],
    });
    console.log("hehehehrehrherhehrehrherh");
    const aiText =
      typeof aiResult === "string" ? aiResult : await aiResult.text;

    // Save assistant message
    const assistantMsg = await Message.create({
      chat: chat._id,
      content: aiText,
      role: "assistant",
    });

    // Add conversation to memory
    try {
      await addUserMemory(
        userId,
        [
          { role: "user", content: message },
          { role: "assistant", content: aiText },
        ],
        {
          chatId: chat._id,
          chatTitle: chat.title,
        }
      );
      console.log("Conversation added to memory for user:", userId);
    } catch (memoryErr) {
      console.error("Error adding to memory:", memoryErr);
      // Continue without memory storage
    }

    // Return all messages
    const messages = await Message.find({ chat: chat._id })
      .sort({ createdAt: 1 })
      .lean();
    return new Response(
      JSON.stringify({
        messages: messages.map((msg) => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt,
        })),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
