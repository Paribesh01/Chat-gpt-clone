import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Chat from "@/model/chat";
import ChatMessage from "@/model/message";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { getUserMemory, addUserMemory } from "@/lib/mem0";
import {
  createTokenManager,
  type Message,
  type ModelName,
} from "@/lib/token-manager";

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

    // Parse the request body
    const body = await req.json();
    const { messages, model = "gpt-4o" } = body;

    // Extract the latest user message
    const latestUserMessage = messages[messages.length - 1];
    const message = latestUserMessage?.content || "";

    let files: UploadedFile[] = [];
    try {
      if (body.files) {
        if (Array.isArray(body.files)) {
          files = body.files;
        } else if (typeof body.files === "string") {
          files = JSON.parse(body.files);
          if (typeof files[0] === "string") {
            files = files.map((f: string) => JSON.parse(f));
          }
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

    // Save user message with files
    const userMsg = await ChatMessage.create({
      chat: chat._id,
      content: message,
      role: "user",
      files: files || [],
    });

    // Get previous messages for context
    const prevMessages = await ChatMessage.find({ chat: chat._id })
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
    }

    // Create token manager for the selected model
    const tokenManager = createTokenManager(model);

    // Prepare messages for AI with token management
    const messagesForAI: Message[] = [
      {
        role: "system",
        content:
          "You are a helpful assistant, similar to ChatGPT. Answer user questions clearly and concisely. When users upload files, analyze the content and provide relevant insights." +
          memoryContext,
      },
      { role: "user", content: message + fileContent },
    ];

    // Add previous conversation context (trimmed to fit token limit)
    if (prevMessages.length > 0) {
      const conversationMessages: Message[] = prevMessages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      const trimmedConversation =
        tokenManager.trimMessages(conversationMessages);
      messagesForAI.splice(1, 0, ...trimmedConversation);
    }

    // Final trim to ensure we're within limits
    const finalMessages = tokenManager.trimMessages(messagesForAI);

    // Log token usage
    const tokenStats = tokenManager.getTokenStats(finalMessages);
    console.log(
      `Token usage: ${tokenStats.totalTokens}/${
        tokenStats.actualLimit
      } (${tokenStats.usagePercentage.toFixed(1)}%)`
    );

    // Use streamText for streaming response with onFinish callback
    const result = await streamText({
      model: openai(model),
      messages: finalMessages,
      onFinish: async (completion) => {
        // Save assistant message after streaming completes
        const aiText = completion.text;
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
        }
      },
    });

    // Return the streaming response
    return result.toDataStreamResponse({
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
