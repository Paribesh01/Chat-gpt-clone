import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Chat from "@/model/chat";
import ChatMessage from "@/model/message";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getUserMemory, addUserMemory } from "@/lib/mem0";

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
    const { newContent } = body;

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

    // Update the message content
    message.content = newContent;
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
      console.error("Error retrieving memory:", memoryErr);
    }

    // Send the edited message to the AI
    const aiResult = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant, similar to ChatGPT. Answer user questions clearly and concisely." +
            memoryContext,
        },
        { role: "user", content: newContent },
      ],
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

    // Return updated messages (including new assistant message)
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
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
