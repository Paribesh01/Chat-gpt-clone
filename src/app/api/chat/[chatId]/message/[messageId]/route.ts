import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Chat from "@/model/chat";
import ChatMessage from "@/model/message";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getUserMemory, addUserMemory } from "@/lib/mem0";
import {
  createTokenManager,
  type Message,
  type ModelName,
} from "@/lib/token-manager";
import { parseUploadedFiles, buildFileContentForAI } from "@/lib/chat-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { chatId: string; messageId: string } }
) {
  try {
    await dbConnect();
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { chatId, messageId } = params;
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
      });
    }

    const body = await req.json();
    const { newContent, files = [], model = "gpt-4o" } = body; // Accept files

    // Parse and build file content for AI
    const parsedFiles = parseUploadedFiles(files);
    const fileContent = buildFileContentForAI(parsedFiles);

    // Find the message to edit
    const message = await ChatMessage.findOne({
      _id: messageId,
      chat: chatId,
      role: "user",
    });
    if (!message) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
      });
    }

    // Update the message content and files
    message.content = newContent;
    message.files = files; // <-- update files
    await message.save();

    // Delete all messages after this one (greater createdAt)
    await ChatMessage.deleteMany({
      chat: chatId,
      createdAt: { $gt: message.createdAt },
    });

    // Get user memory for additional context
    let memoryContext = "";
    try {
      const memories = await getUserMemory(userId, newContent);
      if (memories && memories.length > 0) {
        memoryContext = `\n\nPrevious relevant context:\n${memories.join(
          "\n"
        )}`;
      }
    } catch (memoryErr) {
      console.error("Error getting user memory:", memoryErr);
    }

    // Create token manager for the selected model
    const tokenManager = createTokenManager(model as ModelName);

    // Get conversation history up to the edited message
    const conversationHistory = await ChatMessage.find({
      chat: chatId,
      createdAt: { $lte: message.createdAt },
    })
      .sort({ createdAt: 1 })
      .lean();

    // Prepare messages for AI with token management
    const messagesForAI: Message[] = [
      {
        role: "system",
        content:
          "You are a helpful assistant, similar to ChatGPT. Answer user questions clearly and concisely." +
          memoryContext,
      },
      {
        role: "user",
        content: newContent + fileContent, // <-- append file content here
      },
    ];

    // Add conversation history (trimmed to fit token limits)
    if (conversationHistory.length > 0) {
      const historyMessages: Message[] = conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      // Trim conversation history to fit within token limits
      const trimmedHistory = tokenManager.trimMessages(historyMessages);
      messagesForAI.splice(1, 0, ...trimmedHistory);
    }

    // Ensure final messages fit within token limits
    const finalMessages = tokenManager.trimMessages(messagesForAI);

    // Log token usage
    const tokenStats = tokenManager.getTokenStats(finalMessages);
    console.log(
      `Token usage: ${tokenStats.totalTokens}/${
        tokenStats.actualLimit
      } (${tokenStats.usagePercentage.toFixed(1)}%)`
    );

    // Send the edited message to the AI
    const aiResult = await generateText({
      model: openai(model as ModelName),
      messages: finalMessages,
    });

    const aiText =
      typeof aiResult === "string" ? aiResult : await aiResult.text;

    // Save assistant message
    await ChatMessage.create({
      chat: chat._id,
      content: aiText,
      role: "assistant",
    });

    // Add conversation to memory
    try {
      await addUserMemory(
        userId,
        [
          { role: "user", content: newContent },
          { role: "assistant", content: aiText },
        ],
        {
          chatId: chat._id,
          chatTitle: chat.title,
        }
      );
    } catch (memoryErr) {
      console.error("Error adding to memory:", memoryErr);
    }

    // Return updated messages
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
