import { encode } from "gpt-tokenizer";

// Token limits for different models
export const MODEL_TOKEN_LIMITS = {
  "gpt-4o": 128000,
  "gpt-4o-mini": 128000,
  "gpt-4-turbo": 128000,
  "gpt-4": 8192,
  "gpt-3.5-turbo": 4096,
} as const;

export type ModelName = keyof typeof MODEL_TOKEN_LIMITS;

// Safety buffer to leave room for response tokens (typically 20% of limit)
const SAFETY_BUFFER_RATIO = 0.2;

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TokenManagerOptions {
  model: ModelName;
  safetyBufferRatio?: number;
}

export class TokenManager {
  private model: ModelName;
  private tokenLimit: number;
  private safetyBuffer: number;
  private actualLimit: number;
  private safetyBufferRatio: number;

  constructor(options: TokenManagerOptions) {
    this.model = options.model;
    this.tokenLimit = MODEL_TOKEN_LIMITS[options.model];
    this.safetyBufferRatio = options.safetyBufferRatio || SAFETY_BUFFER_RATIO;
    this.safetyBuffer = Math.floor(this.tokenLimit * this.safetyBufferRatio);
    this.actualLimit = this.tokenLimit - this.safetyBuffer;
  }

  /**
   * Count tokens in a string
   */
  countTokens(text: string): number {
    try {
      return encode(text).length;
    } catch (error) {
      console.error("Error counting tokens:", error);
      // Fallback: rough estimation (1 token ≈ 4 characters)
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Count tokens in a message array
   */
  countMessageTokens(messages: Message[]): number {
    let totalTokens = 0;

    for (const message of messages) {
      // Add tokens for the message content
      totalTokens += this.countTokens(message.content);

      // Add tokens for the role and formatting (rough estimation)
      totalTokens += 4; // Role overhead
    }

    return totalTokens;
  }

  /**
   * Trim messages to fit within token limit while preserving conversation flow
   */
  trimMessages(messages: Message[]): Message[] {
    if (messages.length === 0) return messages;

    const totalTokens = this.countMessageTokens(messages);

    // If we're under the limit, return as is
    if (totalTokens <= this.actualLimit) {
      return messages;
    }

    console.log(
      `Token limit exceeded: ${totalTokens}/${this.actualLimit} tokens`
    );

    // Always keep the system message if present
    const systemMessages = messages.filter((msg) => msg.role === "system");
    const nonSystemMessages = messages.filter((msg) => msg.role !== "system");

    // Calculate tokens for system messages
    const systemTokens = this.countMessageTokens(systemMessages);
    const availableTokens = this.actualLimit - systemTokens;

    if (availableTokens <= 0) {
      console.warn(
        "System messages exceed token limit, returning only system messages"
      );
      return systemMessages;
    }

    // Start with the most recent messages and work backwards
    const trimmedMessages: Message[] = [...systemMessages];
    let currentTokens = systemTokens;

    // Add messages from the end (most recent) to the beginning
    for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
      const message = nonSystemMessages[i];
      const messageTokens = this.countTokens(message.content) + 4; // +4 for role overhead

      if (currentTokens + messageTokens <= availableTokens) {
        trimmedMessages.unshift(message);
        currentTokens += messageTokens;
      } else {
        // If we can't fit the full message, try to truncate it
        const remainingTokens = availableTokens - currentTokens;
        if (remainingTokens > 10) {
          // Minimum viable message
          const truncatedContent = this.truncateText(
            message.content,
            remainingTokens - 4
          );
          if (truncatedContent) {
            trimmedMessages.unshift({
              role: message.role,
              content: truncatedContent + " [truncated]",
            });
          }
        }
        break;
      }
    }

    console.log(
      `Trimmed messages: ${
        trimmedMessages.length
      } messages, ${this.countMessageTokens(trimmedMessages)} tokens`
    );
    return trimmedMessages;
  }

  /**
   * Truncate text to fit within token limit
   */
  private truncateText(text: string, maxTokens: number): string {
    if (maxTokens <= 0) return "";

    // Start with the full text and reduce until we fit
    let truncated = text;
    let tokens = this.countTokens(truncated);

    while (tokens > maxTokens && truncated.length > 0) {
      // Remove 10% of the text at a time for efficiency
      const removeLength = Math.max(1, Math.floor(truncated.length * 0.1));
      truncated = truncated.slice(0, -removeLength);
      tokens = this.countTokens(truncated);
    }

    return truncated;
  }

  /**
   * Get token usage statistics
   */
  getTokenStats(messages: Message[]): {
    totalTokens: number;
    limit: number;
    actualLimit: number;
    usagePercentage: number;
    remainingTokens: number;
  } {
    const totalTokens = this.countMessageTokens(messages);
    const usagePercentage = (totalTokens / this.actualLimit) * 100;
    const remainingTokens = Math.max(0, this.actualLimit - totalTokens);

    return {
      totalTokens,
      limit: this.tokenLimit,
      actualLimit: this.actualLimit,
      usagePercentage,
      remainingTokens,
    };
  }
}

/**
 * Utility function to create a token manager for a specific model
 */
export function createTokenManager(
  model: ModelName,
  options?: Partial<TokenManagerOptions>
): TokenManager {
  return new TokenManager({
    model,
    ...options,
  });
}
