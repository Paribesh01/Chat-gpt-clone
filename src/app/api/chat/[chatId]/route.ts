import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Chat from "@/model/chat";
import ChatMessage from "@/model/message";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
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
} from "@/lib/chat-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
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
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
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

    // --- Helper functions ---
    const parseFilesAndContent = async (files: any[]) => {
      const parsedFiles = parseUploadedFiles(files);
      const fileContent = await buildFileContentForAI(parsedFiles);
      return { parsedFiles, fileContent };
    };

    // --- MODIFIED FUNCTION ---
    const prepareMessagesForAI = async ({
      systemPrompt,
      userContent,
      chatId,
      userId,
      model,
      historyQuery,
      memoryContext,
      parsedFiles = [],
    }: {
      systemPrompt: string;
      userContent: string;
      chatId: string;
      userId: string;
      model: any;
      historyQuery: any;
      memoryContext: string;
      parsedFiles?: any[];
    }) => {
      const tokenManager = createTokenManager(model);
      const history = await ChatMessage.find(historyQuery)
        .sort({ createdAt: 1 })
        .lean();

      // --- NEW LOGIC: multimodal user content ---
      let userContentForAI: any = userContent;

      const imageFiles = parsedFiles.filter(
        (file) => file.type && file.type.startsWith("image/")
      );

      if (imageFiles.length > 0) {
        // Helper to fetch and convert image URL to base64 if needed
        const toImageBlock = async (file: any) => {
          return {
            type: "image",
            image: file.url,
          };
        };

        // Await all image blocks
        const imageBlocks = await Promise.all(imageFiles.map(toImageBlock));
        userContentForAI =
          imageFiles.length > 0
            ? [{ type: "text", text: userContent }, ...imageBlocks]
            : userContent;
      }

      const messagesForAI: Message[] = [
        { role: "system", content: systemPrompt + memoryContext },
        { role: "user", content: userContentForAI }, // content is array if multimodal, string if not
      ];

      if (history.length > 0) {
        const historyMessages: Message[] = history.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));
        messagesForAI.splice(1, 0, ...historyMessages);
      }

      const finalMessages = tokenManager.trimMessages(messagesForAI);

      // Log token usage
      const tokenStats = tokenManager.getTokenStats(finalMessages);
      console.log(
        `Token usage: ${tokenStats.totalTokens}/${
          tokenStats.actualLimit
        } (${tokenStats.usagePercentage.toFixed(1)}%)`
      );

      return { finalMessages, tokenManager };
    };

    const saveAssistantMessageAndMemory = async ({
      chat,
      userId,
      userMessage,
      aiText,
    }: {
      chat: any;
      userId: string;
      userMessage: string;
      aiText: string;
    }) => {
      await ChatMessage.create({
        chat: chat._id,
        content: aiText,
        role: "assistant",
      });
      try {
        await addUserMemory(
          userId,
          [
            { role: "user", content: userMessage },
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
    };

    const streamAndSaveResponse = async ({
      model,
      messages,
      chat,
      userId,
      userMessage,
    }: {
      model: string;
      messages: Message[];
      chat: any;
      userId: string;
      userMessage: string;
    }) => {
      // Create the assistant message first
      const assistantMessage = await ChatMessage.create({
        chat: chat._id,
        content: " ", // Use a space instead of empty string
        role: "assistant",
      });

      const result = await streamText({
        model: openai(model as ModelName),
        messages,
        onChunk: async (chunk) => {
          // Update the assistant message with each chunk
          if (chunk.chunk.type === "text-delta") {
            assistantMessage.content += chunk.chunk.textDelta;
            await assistantMessage.save();
          }
        },
        onFinish: async (completion) => {
          // Add to memory
          try {
            await addUserMemory(
              userId,
              [
                { role: "user", content: userMessage },
                { role: "assistant", content: completion.text },
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

      return result.toDataStreamResponse({
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    };

    // --- Parse the request body ---
    const body = await req.json();
    const { isEdit, model = "gpt-4o" } = body;

    // Variables to be set in each branch
    let modelToCall: string;
    let finalMessages: Message[];
    let userMessage: string;

    if (isEdit) {
      // --- EDIT LOGIC ---
      const { messageId, newContent, files = [] } = body;
      const { parsedFiles, fileContent } = await parseFilesAndContent(files);

      // Find and update the message
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
      message.content = newContent;
      message.files = files;
      await message.save();

      // Delete all messages after this one
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

      // Prepare messages for AI
      const result = await prepareMessagesForAI({
        systemPrompt:
          "You are a helpful assistant, similar to ChatGPT. Answer user questions clearly and concisely. When users upload files, analyze the content and provide relevant insights.",
        userContent: newContent + fileContent,
        chatId,
        userId,
        model,
        historyQuery: { chat: chatId, createdAt: { $lte: message.createdAt } },
        memoryContext,
        parsedFiles, // <-- pass parsedFiles for multimodal
      });

      modelToCall = model;
      finalMessages = result.finalMessages;
      userMessage = newContent;
    } else {
      // --- NORMAL SEND LOGIC ---
      const { messages, files, model: postModel } = body;
      const modelToUse = postModel || model;
      const latestUserMessage = messages[messages.length - 1];
      const message = latestUserMessage?.content || "";
      const { parsedFiles, fileContent } = await parseFilesAndContent(files);

      if (!message && (!parsedFiles || parsedFiles.length === 0)) {
        return new Response(
          JSON.stringify({ error: "No message or files provided" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Save user message with files
      await ChatMessage.create({
        chat: chat._id,
        content: message,
        role: "user",
        files: parsedFiles || [],
      });

      // Get user memory for additional context
      const memoryContext = await getMemoryContext(userId, message);

      // Prepare messages for AI
      const result = await prepareMessagesForAI({
        systemPrompt:
          "You are a helpful assistant, similar to ChatGPT. Answer user questions clearly and concisely. When users upload files, analyze the content and provide relevant insights.",
        userContent: message + fileContent,
        chatId: chat._id,
        userId,
        model: modelToUse,
        historyQuery: { chat: chat._id },
        memoryContext,
        parsedFiles, // <-- pass parsedFiles for multimodal
      });

      modelToCall = modelToUse;
      finalMessages = result.finalMessages;
      userMessage = message;
    }

    // --- Call streamAndSaveResponse once ---
    return await streamAndSaveResponse({
      model: modelToCall,
      messages: finalMessages,
      chat,
      userId,
      userMessage,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
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

    // Delete chat and its messages
    const chat = await Chat.findOneAndDelete({ _id: chatId, userId });
    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    await ChatMessage.deleteMany({ chat: chatId });

    return new Response(JSON.stringify({ success: true }), {
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
