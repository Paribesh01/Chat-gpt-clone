import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  url: string;
  extractedText?: string;
}

interface FileDisplayProps {
  files: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
}

export function FileDisplay({ files, onRemoveFile }: FileDisplayProps) {
  if (files.length === 0) return null;

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return "🖼️";
    } else if (type === "application/pdf") {
      return "📄";
    } else if (type.includes("word")) {
      return "📝";
    } else if (type.includes("text/")) {
      return "📄";
    }
    return "📎";
  };

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-medium text-gray-300">Attached Files:</h4>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 bg-[#2f2f2f] rounded-lg border border-[#565656]"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{getFileIcon(file.type)}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  {file.name}
                </span>
                <span className="text-xs text-gray-400">{file.type}</span>
                {file.extractedText && (
                  <span className="text-xs text-green-400 mt-1">
                    Text extracted: {file.extractedText.length} characters
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveFile(file.id)}
              className="text-gray-400 hover:text-white"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
