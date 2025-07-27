import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Chat from "@/model/chat";
import ChatMessage from "@/model/message";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { addUserMemory } from "@/lib/mem0";
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

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const message = body.message;
    const model: ModelName = body.model || "gpt-4o"; // Default to gpt-4o if not specified

    // Use shared utility
    const files: UploadedFile[] = parseUploadedFiles(body.files);

    // Get userId from Clerk
    const { userId } = await auth();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!message && (!files || files.length === 0)) {
      console.log("No message or files provided in request");
      return new Response(
        JSON.stringify({ error: "No message or files provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get user memory for context
    const memoryContext = await getMemoryContext(userId, message);

    // Create token manager for title generation
    const titleTokenManager = createTokenManager(model);

    // 1. Generate a title for the chat using the first user message
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

      // Ensure title generation fits within token limits
      const trimmedTitleMessages =
        titleTokenManager.trimMessages(titleMessages);

      const { text: titleText } = await generateText({
        model: openai(model),
        messages: trimmedTitleMessages,
      });
      chatTitle = titleText.trim();
      console.log("Generated chat title:", chatTitle);
    } catch (titleErr) {
      console.error("Error generating chat title:", titleErr);
      // Fallback to default title
    }

    // 2. Create chat with userId and generated title
    const chat = await Chat.create({ userId, title: chatTitle });
    console.log("Chat created:", chat._id);

    // --- PATCH: Prepare file content for AI ---
    const fileContent = buildFileContentForAI(files);
    // --- PATCH END ---

    // 3. Save user message (with files)
    const userMsg = await ChatMessage.create({
      chat: chat._id,
      content: message,
      role: "user",
      files: files || [],
    });
    console.log("User message saved:", userMsg._id);

    // Create token manager for main conversation
    const tokenManager = createTokenManager(model);

    // 4. Get AI response with memory and file context
    console.log("About to call generateText");
    let aiText;
    try {
      const messagesForAI: Message[] = [
        {
          role: "system",
          content:
            "You are a helpful assistant, similar to ChatGPT. Answer user questions clearly and concisely." +
            memoryContext,
        },
        { role: "user", content: (message || "") + fileContent },
      ];

      // Ensure messages fit within token limits
      const trimmedMessages = tokenManager.trimMessages(messagesForAI);

      // Log token usage
      const tokenStats = tokenManager.getTokenStats(trimmedMessages);
      console.log(
        `Token usage: ${tokenStats.totalTokens}/${
          tokenStats.actualLimit
        } (${tokenStats.usagePercentage.toFixed(1)}%)`
      );

      const { text } = await generateText({
        model: openai(model),
        messages: trimmedMessages,
      });
      aiText = text;
      console.log("AI response received");
    } catch (aiErr) {
      console.error("Error during generateText:", aiErr);
      throw aiErr; // rethrow to be caught by outer catch
    }

    // 5. Save assistant message
    const assistantMsg = await ChatMessage.create({
      chat: chat._id,
      content: aiText,
      role: "assistant",
    });
    console.log("Assistant message saved:", assistantMsg._id);

    // 6. Add conversation to memory
    try {
      await addUserMemory(
        userId,
        [
          { role: "user", content: message },
          { role: "assistant", content: aiText },
        ],
        {
          chatId: chat._id,
          chatTitle: chatTitle,
        }
      );
      console.log("Conversation added to memory for user:", userId);
    } catch (memoryErr) {
      console.error("Error adding to memory:", memoryErr);
      // Continue without memory storage
    }

    // 7. Return chat id and messages (include files)
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
            files: userMsg.files || [],
          },
          {
            id: assistantMsg._id,
            role: "assistant",
            content: assistantMsg.content,
            timestamp: assistantMsg.createdAt,
            files: [],
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
