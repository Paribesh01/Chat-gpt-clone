import mammoth from "mammoth";
import { pdfToText } from "pdf-ts";

export async function extractTextFromFile(
  file: File,
  mimeType: string
): Promise<string> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    switch (mimeType) {
      case "application/pdf": {
        const result = await pdfToText(buffer);
        return result;
      }

      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      }

      case "text/plain":
      case "text/markdown": {
        return buffer.toString("utf-8");
      }

      default:
        return "";
    }
  } catch (err) {
    console.error("Failed to extract text:", err);
    return "";
  }
}
