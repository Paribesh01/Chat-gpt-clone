// Utility functions for chat API routes

import { getUserMemory } from "@/lib/mem0";

// Shared UploadedFile type
export interface UploadedFile {
  name: string;
  extractedText?: string;
  url?: string;
  size?: number;
  type?: string;
}

export function parseUploadedFiles(filesInput: any): UploadedFile[] {
  let files: UploadedFile[] = [];
  try {
    if (Array.isArray(filesInput)) {
      files = filesInput;
    } else if (typeof filesInput === "string") {
      const parsed = JSON.parse(filesInput);
      if (Array.isArray(parsed) && typeof parsed[0] === "string") {
        files = parsed.map((f: string) => JSON.parse(f));
      } else {
        files = parsed;
      }
    }
  } catch (err) {
    console.error("❌ Failed to parse uploaded files:", err);
    files = [];
  }
  return files;
}

export function buildFileContentForAI(files: UploadedFile[]): string {
  if (!files || files.length === 0) return "";

  const fileTexts = files
    .map((file) => {
      // If it's an image (by extension or mime type), just add the URL
      if (
        file.url &&
        file.name &&
        file.name.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)
      ) {
        return `User uploaded an image: ${file.url}`;
      }
      // If it has extracted text (e.g., PDF), show the text
      if (file.extractedText && file.extractedText.trim()) {
        return `[File: ${file.name}]\n${file.extractedText.trim()}`;
      }
      // Otherwise, just mention the file
      if (file.url && file.name) {
        return `User uploaded a file: ${file.url}`;
      }
      return null;
    })
    .filter(Boolean)
    .join("\n\n");

  console.log("fileTexts!!!!", fileTexts);

  return fileTexts
    ? `\n\nThe following files were uploaded by the user:\n${fileTexts}`
    : "";
}

export async function getMemoryContext(userId: string, message: string) {
  try {
    const memories = await getUserMemory(userId, message);
    if (memories && memories.length > 0) {
      return `\n\nPrevious relevant context:\n${memories.join("\n")}`;
    }
  } catch (err) {
    console.error("Error retrieving memory:", err);
  }
  return "";
}
