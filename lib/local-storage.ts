/**
 * Local Storage based chat and message storage
 * Provides persistent storage for chats without requiring a backend
 */

import type { UIMessage } from "@ai-sdk/react";
import { z } from "zod";

// Types for local storage
export type LocalChat = {
  id: string;
  title: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
};

// Zod schema for message validation
export const LocalMessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: z.enum(["user", "assistant", "system", "data"]),
  content: z.string(),
  parts: z.array(z.any()).optional(), // We can be more specific if needed, but parts structure is complex
  createdAt: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type LocalMessage = z.infer<typeof LocalMessageSchema>;

const CHATS_KEY = "yurie_chats";
// const MESSAGES_KEY = "yurie_messages"; // Deprecated
const MESSAGES_KEY_PREFIX = "yurie_messages_";
const SETTINGS_KEY = "yurie_settings";
const CHATS_UPDATED_EVENT = "chatsUpdated";

function dispatchChatsUpdated(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(CHATS_UPDATED_EVENT));
}

// Settings type
export type LocalSettings = {
  preferredModel?: string;
  name?: string;
  occupation?: string;
  traits?: string;
  customInstructions?: string;
  disabledModels?: string[];
  favoriteModels?: string[];
};

// Generate a unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Chat operations
export function getChats(): LocalChat[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const data = localStorage.getItem(CHATS_KEY);
    return data ? (JSON.parse(data) as LocalChat[]) : [];
  } catch {
    return [];
  }
}

export function getChat(chatId: string): LocalChat | null {
  const chats = getChats();
  return chats.find((c) => c.id === chatId) ?? null;
}

export function createChat(title: string, model: string): LocalChat {
  const normalizedTitle = title.trim();
  const chat: LocalChat = {
    id: generateId(),
    title: normalizedTitle || "Untitled chat",
    model,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPinned: false,
  };

  const chats = getChats();
  chats.unshift(chat);
  saveChats(chats);

  return chat;
}

export function updateChat(
  chatId: string,
  updates: Partial<LocalChat>
): LocalChat | null {
  const chats = getChats();
  const index = chats.findIndex((c) => c.id === chatId);

  if (index === -1) {
    return null;
  }

  const normalizedUpdates: Partial<LocalChat> = { ...updates };
  if (typeof normalizedUpdates.title === "string") {
    const trimmedTitle = normalizedUpdates.title.trim();
    normalizedUpdates.title = trimmedTitle || "Untitled chat";
  }

  chats[index] = {
    ...chats[index],
    ...normalizedUpdates,
  };

  saveChats(chats);
  return chats[index];
}

function touchChat(chatId: string): LocalChat | null {
  const chats = getChats();
  const index = chats.findIndex((c) => c.id === chatId);

  if (index === -1) {
    return null;
  }

  chats[index] = {
    ...chats[index],
    updatedAt: Date.now(),
  };

  saveChats(chats);
  return chats[index];
}

export function deleteChat(chatId: string): boolean {
  const chats = getChats();
  const filtered = chats.filter((c) => c.id !== chatId);

  if (filtered.length === chats.length) {
    return false;
  }

  saveChats(filtered);
  deleteMessagesForChat(chatId);

  return true;
}

export function saveChats(chats: LocalChat[]): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  dispatchChatsUpdated();
}

// Message operations
function getChatMessagesKey(chatId: string): string {
  return `${MESSAGES_KEY_PREFIX}${chatId}`;
}

// Migration helper: Move from giant list to per-chat lists
function migrateMessagesIfNeeded(chatId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  // If we already have the new key, assume migrated (or empty)
  if (localStorage.getItem(getChatMessagesKey(chatId))) {
    return;
  }

  const OLD_KEY = "yurie_messages";
  const oldData = localStorage.getItem(OLD_KEY);
  if (!oldData) {
    return;
  }

  try {
    const allOldMessages = JSON.parse(oldData) as LocalMessage[];
    // Filter for this chat
    const chatMessages = allOldMessages.filter((m) => m.chatId === chatId);

    if (chatMessages.length > 0) {
      // Save to new location
      localStorage.setItem(
        getChatMessagesKey(chatId),
        JSON.stringify(chatMessages)
      );
      // We don't delete from old key to be safe, or we can rely on a global migration later.
      // But for "lazy" migration, this works.
    }
  } catch (e) {
    console.error("Migration failed for chat", chatId, e);
  }
}

export function getMessages(chatId: string): LocalMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  // Attempt migration if needed
  migrateMessagesIfNeeded(chatId);

  try {
    const key = getChatMessagesKey(chatId);
    const data = localStorage.getItem(key);
    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);
    // Validate with Zod - if fails, return empty or try to recover?
    // We'll return what matches
    if (Array.isArray(parsed)) {
      return parsed
        .filter((m) => {
          const result = LocalMessageSchema.safeParse(m);
          return result.success;
        })
        .sort((a, b) => a.createdAt - b.createdAt) as LocalMessage[];
    }
    return [];
  } catch {
    return [];
  }
}

// WARNING: High cost operation. Use sparingly (e.g. export)
export function getAllMessages(): LocalMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  // Also check old storage for migration purposes if needed
  // For now, iterate all chats
  const chats = getChats();
  const allMessages: LocalMessage[] = [];

  for (const chat of chats) {
    allMessages.push(...getMessages(chat.id));
  }

  return allMessages;
}

export function saveMessage(message: LocalMessage): LocalMessage {
  if (typeof window === "undefined") {
    return message;
  }

  const key = getChatMessagesKey(message.chatId);
  const currentMessages = getMessages(message.chatId);

  // Avoid duplicates? The caller usually handles this, but we append.
  // Check if message with ID exists to update it vs append
  const existingIndex = currentMessages.findIndex((m) => m.id === message.id);

  if (existingIndex >= 0) {
    currentMessages[existingIndex] = message;
  } else {
    currentMessages.push(message);
  }

  localStorage.setItem(key, JSON.stringify(currentMessages));

  // Touch the parent chat so history ordering/grouping stays correct.
  touchChat(message.chatId);
  return message;
}

// For imports mainly
export function saveAllMessages(messages: LocalMessage[]): void {
  if (typeof window === "undefined") {
    return;
  }

  // Group by chatId
  const messagesByChat: Record<string, LocalMessage[]> = {};

  for (const msg of messages) {
    if (!messagesByChat[msg.chatId]) {
      messagesByChat[msg.chatId] = [];
    }
    messagesByChat[msg.chatId].push(msg);
  }

  // Save each group
  for (const [chatId, msgs] of Object.entries(messagesByChat)) {
    // We should probably merge with existing? Or overwrite?
    // `saveAllMessages` in the old impl overwrote everything (based on the input list being "all").
    // For import, we usually want to overwrite or merge.
    // Let's implement merge semantics to be safe: load existing, upsert new ones.

    const existing = getMessages(chatId);
    const existingMap = new Map(existing.map((m) => [m.id, m]));

    for (const m of msgs) {
      existingMap.set(m.id, m);
    }

    const merged = Array.from(existingMap.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );
    localStorage.setItem(getChatMessagesKey(chatId), JSON.stringify(merged));
  }
}

function deleteMessagesForChat(chatId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(getChatMessagesKey(chatId));
}

// Updated signature to include chatId for efficiency
export function deleteMessage(chatId: string, messageId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const messages = getMessages(chatId);
  const index = messages.findIndex((m) => m.id === messageId);

  if (index === -1) {
    return false;
  }

  // Delete this message and all messages after it in the same chat (Branching logic often implies this)
  // The original implementation deleted "all messages after it in the same chat".
  // Let's preserve that behavior.

  const targetMessage = messages[index];
  // Filter out the target and anything created after it
  const filtered = messages.filter(
    (m) => m.createdAt < targetMessage.createdAt
  );

  localStorage.setItem(getChatMessagesKey(chatId), JSON.stringify(filtered));
  return true;
}

// Settings operations
export function getSettings(): LocalSettings {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? (JSON.parse(data) as LocalSettings) : {};
  } catch {
    return {};
  }
}

export function updateSettings(updates: Partial<LocalSettings>): LocalSettings {
  const settings = getSettings();
  const newSettings = { ...settings, ...updates };

  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  }

  return newSettings;
}

// Helper to convert UIMessage to LocalMessage format
export function fromUIMessage(
  uiMessage: UIMessage,
  chatId: string
): LocalMessage {
  const textPart = uiMessage.parts?.find((p) => p.type === "text");
  const content = textPart && "text" in textPart ? textPart.text : "";

  // Helper to ensure role is valid
  const role = (
    ["user", "assistant", "system", "data"].includes(uiMessage.role)
      ? uiMessage.role
      : "user"
  ) as "user" | "assistant" | "system" | "data";

  return {
    id: uiMessage.id,
    chatId,
    role,
    content,
    parts: uiMessage.parts,
    createdAt: Date.now(),
    metadata: {},
  };
}
