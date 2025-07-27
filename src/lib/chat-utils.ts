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
      files = JSON.parse(filesInput);
      if (typeof files[0] === "string") {
        files = files.map((f: string) => JSON.parse(f));
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
    .map((file) =>
      file.extractedText && file.extractedText.trim()
        ? `[File: ${file.name}]\n${file.extractedText.trim()}`
        : null
    )
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
