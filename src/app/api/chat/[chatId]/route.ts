import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Chat from "@/model/chat";
import ChatMessage from "@/model/message";
import { openai } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { addUserMemory, getUserMemory } from "@/lib/mem0";
import {
  createTokenManager,
  type Message,
  type ModelName,
} from "@/lib/token-manager";
import {
  parseUploadedFiles,
  buildFileContentForAI,
  getMemoryContext,
  type UploadedFile,
} from "@/lib/chat-utils";

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

// Combined POST handler for both new message and edit
export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    console.log("POST /api/chat called");
    const { chatId } = params;
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
    const { isEdit, model = "gpt-4o" } = body;

    if (isEdit) {
      // --- EDIT LOGIC (from PATCH) ---
      const { messageId, newContent, files = [] } = body;

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
      message.files = files;
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
          content: newContent + fileContent,
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

      const result = await streamText({
        model: openai(model as ModelName),
        messages: finalMessages,
        onFinish: async (completion) => {
          const aiText = completion.text;
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
    } else {
      // --- NORMAL SEND LOGIC (from POST) ---
      const { messages, files, model: postModel } = body;
      const modelToUse = postModel || model;

      // Extract the latest user message
      const latestUserMessage = messages[messages.length - 1];
      const message = latestUserMessage?.content || "";

      const parsedFiles: UploadedFile[] = parseUploadedFiles(files);

      if (!message && (!parsedFiles || parsedFiles.length === 0)) {
        return new Response(
          JSON.stringify({ error: "No message or files provided" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Process files and extract text content for AI
      const fileContent = buildFileContentForAI(parsedFiles);

      // Save user message with files
      await ChatMessage.create({
        chat: chat._id,
        content: message,
        role: "user",
        files: parsedFiles || [],
      });

      // Get previous messages for context
      const prevMessages = await ChatMessage.find({ chat: chat._id })
        .sort({ createdAt: 1 })
        .lean();

      // Get user memory for additional context
      const memoryContext = await getMemoryContext(userId, message);

      // Create token manager for the selected model
      const tokenManager = createTokenManager(modelToUse);

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
        model: openai(modelToUse),
        messages: finalMessages,
        onFinish: async (completion) => {
          // Save assistant message after streaming completes
          const aiText = completion.text;
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
    }
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
