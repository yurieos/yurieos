/**
 * Local Storage based chat and message storage
 * Provides persistent storage for chats without requiring a backend
 */

import type { UIMessage } from "@ai-sdk/react";

// Types for local storage
export type LocalChat = {
  id: string;
  title: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
};

export type LocalMessage = {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: UIMessage["parts"];
  createdAt: number;
  metadata?: Record<string, unknown>;
};

const CHATS_KEY = "yurie_chats";
const MESSAGES_KEY = "yurie_messages";
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

function saveChats(chats: LocalChat[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    dispatchChatsUpdated();
  } catch {
    // Handle quota exceeded or other errors silently
  }
}

// Message operations
export function getMessages(chatId: string): LocalMessage[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const data = localStorage.getItem(MESSAGES_KEY);
    const allMessages = data ? (JSON.parse(data) as LocalMessage[]) : [];
    return allMessages
      .filter((m) => m.chatId === chatId)
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

function getAllMessages(): LocalMessage[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const data = localStorage.getItem(MESSAGES_KEY);
    return data ? (JSON.parse(data) as LocalMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveMessage(message: LocalMessage): LocalMessage {
  const allMessages = getAllMessages();
  allMessages.push(message);
  saveAllMessages(allMessages);
  // Touch the parent chat so history ordering/grouping stays correct.
  touchChat(message.chatId);
  return message;
}

function saveAllMessages(messages: LocalMessage[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    // Handle quota exceeded or other errors silently
  }
}

function deleteMessagesForChat(chatId: string): void {
  const allMessages = getAllMessages();
  const filtered = allMessages.filter((m) => m.chatId !== chatId);
  saveAllMessages(filtered);
}

export function deleteMessage(messageId: string): boolean {
  const allMessages = getAllMessages();
  const index = allMessages.findIndex((m) => m.id === messageId);

  if (index === -1) {
    return false;
  }

  // Delete this message and all messages after it in the same chat
  const targetMessage = allMessages[index];
  const filtered = allMessages.filter(
    (m) =>
      m.chatId !== targetMessage.chatId || m.createdAt < targetMessage.createdAt
  );

  saveAllMessages(filtered);
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
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {
      // Handle quota exceeded or other errors silently
    }
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

  return {
    id: uiMessage.id,
    chatId,
    role: uiMessage.role as "user" | "assistant" | "system",
    content,
    parts: uiMessage.parts,
    createdAt: Date.now(),
    metadata: {},
  };
}
