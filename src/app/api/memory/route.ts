import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAllUserMemories, deleteAllUserMemory } from "@/lib/mem0";
import { memo } from "react";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const memories = await getAllUserMemories(userId);

    return new Response(JSON.stringify({ memories }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch memories" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await deleteAllUserMemory(userId);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to delete memories" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
