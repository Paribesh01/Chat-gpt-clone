import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Chat from "@/model/chat";
import ChatMessage from "@/model/message";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { getUserMemory, addUserMemory } from "@/lib/mem0";

interface UploadedFile {
  name: string;
  extractedText?: string;
  url?: string;
  size?: number;
  type?: string;
}

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
    const messages = await ChatMessage.find({ chat: chatId })
      .sort({ createdAt: 1 })
      .lean();
    return new Response(
      JSON.stringify({
        messages: messages.map((msg) => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt,
          files: msg.files || [],
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

    const body = await req.json();
    const message = body.message;

    let files: UploadedFile[] = [];

    try {
      if (Array.isArray(body.files)) {
        files = body.files;
      } else if (typeof body.files === "string") {
        files = JSON.parse(body.files);

        // Handle case where inner values are stringified objects
        if (typeof files[0] === "string") {
          files = files.map((f: string) => JSON.parse(f));
        }
      }
    } catch (err) {
      console.error("❌ Failed to parse uploaded files:", err);
      files = [];
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

    // Process files and extract text content for AI
    let fileContent = "";
    if (files && files.length > 0) {
      const fileTexts = files
        .map((file: UploadedFile) =>
          file.extractedText && file.extractedText.trim()
            ? `[File: ${file.name}]\n${file.extractedText.trim()}`
            : null
        )
        .filter(Boolean)
        .join("\n\n");

      if (fileTexts) {
        fileContent = `\n\nThe following files were uploaded by the user:\n${fileTexts}`;
      }
    }

    console.log("**************", fileContent);

    console.log("🧾 About to save message with files:", files);
    console.log("🧠 Type of files[0]:", typeof files?.[0]);

    // Save user message with files (original message only, not file content)
    const userMsg = await ChatMessage.create({
      chat: chat._id,
      content: message, // Save only the original message
      role: "user",
      files: files || [],
    });

    // Get previous messages for context (limit to last 10)
    const prevMessages = await ChatMessage.find({ chat: chat._id })
      .sort({ createdAt: 1 })
      .lean();

    // Get user memory for additional context
    let memoryContext = "";
    try {
      const memories = await getUserMemory(userId, message); // Use full content for memory
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
            "You are a helpful assistant, similar to ChatGPT. Answer user questions clearly and concisely. When users upload files, analyze the content and provide relevant insights." +
            memoryContext,
        },

        { role: "user", content: message + fileContent }, // Send full content to AI
      ],
    });

    const aiText =
      typeof aiResult === "string" ? aiResult : await aiResult.text;

    // Save assistant message
    const assistantMsg = await ChatMessage.create({
      chat: chat._id,
      content: aiText,
      role: "assistant",
    });

    // Add conversation to memory
    try {
      await addUserMemory(
        userId,
        [
          { role: "user", content: message }, // Use full content for memory
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
    const messages = await ChatMessage.find({ chat: chat._id })
      .sort({ createdAt: 1 })
      .lean();
    return new Response(
      JSON.stringify({
        messages: messages.map((msg) => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt,
          files: msg.files || [],
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
