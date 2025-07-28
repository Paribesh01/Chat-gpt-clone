import cloudinary from "@/lib/cloudinary";
import { extractTextFromFile } from "@/lib/text-extracter";
import type { UploadApiResponse } from "cloudinary";

const SUPPORTED_FILE_TYPES = {
  images: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ],
};

export async function POST(request: Request) {
  try {
    const uploadsFolder = process.env.CLOUDINARY_UPLOADS_FOLDER;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const mimeType = file.type;
    const fileBuffer = await file.arrayBuffer();
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { resource_type: "auto", folder: uploadsFolder },
          (error, result) => {
            if (error || !result) reject(error);
            else resolve(result);
          }
        )
        .end(Buffer.from(fileBuffer));
    });

    // Only extract text for supported document types
    let extractedText = "";
    if (SUPPORTED_FILE_TYPES.documents.includes(mimeType)) {
      extractedText = await extractTextFromFile(file, mimeType);
    }

    return Response.json({
      secure_url: result.url,
      extracted_text: extractedText,
      file_name: file.name,
      file_type: mimeType,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return Response.json({ error: "Error uploading file" }, { status: 500 });
  }
}
