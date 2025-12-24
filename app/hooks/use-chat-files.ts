import { useCallback, useState } from "react";

// Convert a File to a data URL (base64)
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function useChatFiles() {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleFileUpload = useCallback((files: File[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileRemove = useCallback((file: File) => {
    setPendingFiles((prev) => prev.filter((f) => f !== file));
  }, []);

  const clearFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);

  return {
    pendingFiles,
    handleFileUpload,
    handleFileRemove,
    clearFiles,
  };
}
