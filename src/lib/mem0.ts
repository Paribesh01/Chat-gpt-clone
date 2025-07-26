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
  try {
    await mem0.add(messages, {
      user_id: userId,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
    console.log("memory added for user " + userId);
  } catch (err) {
    console.error("Error adding memory for user", userId, err);
    throw err;
  }
}

export async function getUserMemory(userId: string, query: string, limit = 5) {
  if (!mem0) {
    console.warn("mem0 client not initialized ");
    return;
  }
  try {
    const memories = await mem0.search(query, {
      user_id: userId,
      limit,
    });

    // Filter out extra fields and only return the memory content
    const filteredMemories = memories.map((memory) => memory.memory);
    console.log("memory found for user " + userId + ": ");
    console.log(filteredMemories);
    return filteredMemories;
  } catch (err) {
    console.error("Error getting memory for user", userId, err);
    throw err;
  }
}

export async function deleteAllUserMemory(userId: string) {
  if (!mem0) {
    console.warn("mem0 client not initialized ");
    return;
  }
  try {
    await mem0.deleteAll({
      user_id: userId,
    });
    console.log("All memories deleted for user " + userId);
  } catch (err) {
    console.error("Error deleting all memories for user", userId, err);
    throw err;
  }
}

export async function getAllUserMemories(userId: string) {
  if (!mem0) {
    console.warn("mem0 client not initialized ");
    return;
  }

  try {
    const memories = await mem0.getAll({
      user_id: userId,
    });

    const filteredMemories = memories.map((memory) => ({
      id: memory.id,
      content: memory.memory,
    }));
    return filteredMemories;
  } catch (error) {
    console.error("Error getting all memories:", error);
    return [];
  }
}

export async function deleteSingleUserMemory(userId: string, memoryId: string) {
  if (!mem0) {
    console.warn("mem0 client not initialized ");
    return;
  }
  try {
    await mem0.delete(memoryId);
    console.log(`Memory ${memoryId} deleted for user ${userId}`);
  } catch (err) {
    console.error(`Error deleting memory ${memoryId} for user ${userId}`, err);
    throw err;
  }
}
