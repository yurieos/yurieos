import {
  getAllMessages,
  getChats,
  getSettings,
  type LocalChat,
  type LocalMessage,
  type LocalSettings,
  saveAllMessages,
  saveChats,
  updateSettings,
} from "./local-storage";

export type DataExport = {
  version: number;
  date: number;
  chats: LocalChat[];
  messages: LocalMessage[];
  settings: LocalSettings;
};

const EXPORT_VERSION = 1;

export function exportData(): string {
  const data: DataExport = {
    version: EXPORT_VERSION,
    date: Date.now(),
    chats: getChats(),
    messages: getAllMessages(),
    settings: getSettings(),
  };

  return JSON.stringify(data, null, 2);
}

export function downloadData() {
  const json = exportData();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yurie-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateData(data: unknown): data is DataExport {
  if (typeof data !== "object" || data === null) return false;

  const d = data as Record<string, unknown>;

  return (
    typeof d.version === "number" &&
    Array.isArray(d.chats) &&
    Array.isArray(d.messages) &&
    typeof d.settings === "object"
  );
}

export async function importData(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!validateData(data)) {
      throw new Error("Invalid data format");
    }

    // Backup current data could be implemented here, but for now we replace/merge

    // Save imported data
    saveChats(data.chats);
    saveAllMessages(data.messages);
    updateSettings(data.settings);

    return true;
  } catch (error) {
    console.error("Import failed:", error);
    return false;
  }
}
