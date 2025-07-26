import { MemoryClient } from "mem0ai";

export const mem0 = new MemoryClient({
  apiKey: process.env.MEM0_API_KEY as string,
});

export async function addUserMemory(
  userId: string,
  messages: any[],
  metadata?: any
) {
  if (!mem0) {
    console.warn("mem0 client not initialized ");
    return;
  }

  await mem0.add(messages, {
    user_id: userId,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  });

  console.log("memory added for user " + userId);
}

export async function getUserMemory(userId: string, query: string, limit = 5) {
  if (!mem0) {
    console.warn("mem0 client not initialized ");
    return;
  }
  const memories = await mem0.search(query, {
    user_id: userId,
    limit,
  });

  // Filter out extra fields and only return the memory content
  const filteredMemories = memories.map((memory) => memory.memory);
  console.log("memory found for user " + userId + ": ");
  console.log(filteredMemories);
  return filteredMemories;
}
