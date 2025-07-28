import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteSingleUserMemory } from "@/lib/mem0";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { memoryId } = await params;
  if (!memoryId) {
    return new Response(JSON.stringify({ error: "No memoryId provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await deleteSingleUserMemory(userId, memoryId);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to delete memory" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
