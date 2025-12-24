import type { UIMessage } from "@ai-sdk/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createChat,
  deleteChat,
  deleteMessage,
  fromUIMessage,
  getChat,
  getChats,
  getMessages,
  getSettings,
  type LocalChat,
  type LocalMessage,
  type LocalSettings,
  saveMessage,
  updateChat,
  updateSettings,
} from "../local-storage";

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn(
      (index: number): string | null => Object.keys(store)[index] ?? null
    ),
  };
};

let localStorageMock: ReturnType<typeof createLocalStorageMock>;

describe("local-storage", () => {
  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    // Stub both window and localStorage as the module uses both
    // @ts-expect-error
    global.window = {
      localStorage: localStorageMock,
      dispatchEvent: vi.fn(),
    };
    // @ts-expect-error
    global.localStorage = localStorageMock;
  });

  afterEach(() => {
    // @ts-expect-error
    delete global.window;
    // @ts-expect-error
    delete global.localStorage;
    vi.restoreAllMocks();
  });

  describe("getChats", () => {
    it("should return empty array when no chats exist", () => {
      const chats = getChats();
      expect(chats).toEqual([]);
    });

    it("should return empty array when localStorage returns invalid JSON", () => {
      localStorageMock.getItem.mockReturnValueOnce("invalid json");
      const chats = getChats();
      expect(chats).toEqual([]);
    });

    it("should return chats from localStorage", () => {
      const mockChats: LocalChat[] = [
        {
          id: "chat-1",
          title: "Test Chat",
          model: "gpt-4",
          createdAt: 1000,
          updatedAt: 1000,
          isPinned: false,
        },
      ];
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockChats));

      const chats = getChats();
      expect(chats).toEqual(mockChats);
    });

    it("should return empty array when window is undefined", () => {
      // @ts-expect-error
      delete global.window;
      const chats = getChats();
      expect(chats).toEqual([]);
    });
  });

  describe("getChat", () => {
    it("should return null when chat does not exist", () => {
      const chat = getChat("non-existent");
      expect(chat).toBeNull();
    });

    it("should return the chat when it exists", () => {
      const mockChats: LocalChat[] = [
        {
          id: "chat-1",
          title: "Test Chat",
          model: "gpt-4",
          createdAt: 1000,
          updatedAt: 1000,
          isPinned: false,
        },
        {
          id: "chat-2",
          title: "Another Chat",
          model: "claude-3",
          createdAt: 2000,
          updatedAt: 2000,
          isPinned: true,
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockChats));

      const chat = getChat("chat-2");
      expect(chat).toEqual(mockChats[1]);
    });
  });

  describe("createChat", () => {
    it("should create a new chat with generated id", () => {
      const chat = createChat("My New Chat", "gpt-4");

      expect(chat.title).toBe("My New Chat");
      expect(chat.model).toBe("gpt-4");
      expect(chat.isPinned).toBe(false);
      expect(chat.id).toBeDefined();
      expect(chat.createdAt).toBeDefined();
      expect(chat.updatedAt).toBeDefined();
    });

    it("should trim whitespace from title", () => {
      const chat = createChat("  Spaced Title  ", "gpt-4");
      expect(chat.title).toBe("Spaced Title");
    });

    it("should use default title for empty string", () => {
      const chat = createChat("", "gpt-4");
      expect(chat.title).toBe("Untitled chat");
    });

    it("should use default title for whitespace-only string", () => {
      const chat = createChat("   ", "gpt-4");
      expect(chat.title).toBe("Untitled chat");
    });

    it("should add chat to the beginning of the list", () => {
      const existingChats: LocalChat[] = [
        {
          id: "existing-chat",
          title: "Existing",
          model: "gpt-4",
          createdAt: 1000,
          updatedAt: 1000,
          isPinned: false,
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingChats));

      const newChat = createChat("New Chat", "claude-3");

      // Verify setItem was called with new chat at the beginning
      const savedChats = JSON.parse(
        localStorageMock.setItem.mock.calls[0][1]
      ) as LocalChat[];
      expect(savedChats[0].id).toBe(newChat.id);
      expect(savedChats[1].id).toBe("existing-chat");
    });
  });

  describe("updateChat", () => {
    const mockChats: LocalChat[] = [
      {
        id: "chat-1",
        title: "Original Title",
        model: "gpt-4",
        createdAt: 1000,
        updatedAt: 1000,
        isPinned: false,
      },
    ];

    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockChats));
    });

    it("should return null when chat does not exist", () => {
      const result = updateChat("non-existent", { title: "New Title" });
      expect(result).toBeNull();
    });

    it("should update chat title", () => {
      const result = updateChat("chat-1", { title: "Updated Title" });

      expect(result?.title).toBe("Updated Title");
    });

    it("should trim title whitespace on update", () => {
      const result = updateChat("chat-1", { title: "  Trimmed  " });
      expect(result?.title).toBe("Trimmed");
    });

    it("should use default title for empty update", () => {
      const result = updateChat("chat-1", { title: "" });
      expect(result?.title).toBe("Untitled chat");
    });

    it("should update isPinned status", () => {
      const result = updateChat("chat-1", { isPinned: true });
      expect(result?.isPinned).toBe(true);
    });

    it("should preserve other fields when updating", () => {
      const result = updateChat("chat-1", { isPinned: true });

      expect(result?.id).toBe("chat-1");
      expect(result?.model).toBe("gpt-4");
      expect(result?.createdAt).toBe(1000);
    });
  });

  describe("deleteChat", () => {
    it("should return false when chat does not exist", () => {
      const result = deleteChat("non-existent");
      expect(result).toBe(false);
    });

    it("should delete the chat and return true", () => {
      const mockChats: LocalChat[] = [
        {
          id: "chat-1",
          title: "Chat 1",
          model: "gpt-4",
          createdAt: 1000,
          updatedAt: 1000,
          isPinned: false,
        },
        {
          id: "chat-2",
          title: "Chat 2",
          model: "gpt-4",
          createdAt: 2000,
          updatedAt: 2000,
          isPinned: false,
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockChats));

      const result = deleteChat("chat-1");

      expect(result).toBe(true);
      // Verify the chat was removed
      const savedChats = JSON.parse(
        localStorageMock.setItem.mock.calls[0][1]
      ) as LocalChat[];
      expect(savedChats).toHaveLength(1);
      expect(savedChats[0].id).toBe("chat-2");
    });

    it("should also delete all messages for the chat", () => {
      const mockChats: LocalChat[] = [
        {
          id: "chat-1",
          title: "Chat 1",
          model: "gpt-4",
          createdAt: 1000,
          updatedAt: 1000,
          isPinned: false,
        },
      ];
      // Mock getItem to handle chats. Messages are now stored per chat.
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockChats));

      deleteChat("chat-1");

      // Verify removeItem was called for message key
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "yurie_messages_chat-1"
      );
    });
  });

  describe("getMessages", () => {
    it("should return empty array when no messages exist", () => {
      const messages = getMessages("chat-1");
      expect(messages).toEqual([]);
    });

    it("should return only messages for the specified chat", () => {
      const mockMessages: LocalMessage[] = [
        {
          id: "msg-1",
          chatId: "chat-1",
          role: "user",
          content: "Hello",
          createdAt: 1000,
        },
        {
          id: "msg-3",
          chatId: "chat-1",
          role: "assistant",
          content: "Hi there",
          createdAt: 3000,
        },
      ];
      // Mock specific chat key
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "yurie_messages_chat-1") {
          return JSON.stringify(mockMessages);
        }
        return null;
      });

      const messages = getMessages("chat-1");

      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe("msg-1");
      expect(messages[1].id).toBe("msg-3");
    });

    it("should return messages sorted by createdAt", () => {
      const mockMessages: LocalMessage[] = [
        {
          id: "msg-2",
          chatId: "chat-1",
          role: "assistant",
          content: "Second",
          createdAt: 2000,
        },
        {
          id: "msg-1",
          chatId: "chat-1",
          role: "user",
          content: "First",
          createdAt: 1000,
        },
      ];
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "yurie_messages_chat-1") {
          return JSON.stringify(mockMessages);
        }
        return null;
      });

      const messages = getMessages("chat-1");

      expect(messages[0].id).toBe("msg-1");
      expect(messages[1].id).toBe("msg-2");
    });

    it("should return empty array when window is undefined", () => {
      // @ts-expect-error
      delete global.window;
      const messages = getMessages("chat-1");
      expect(messages).toEqual([]);
    });
  });

  describe("saveMessage", () => {
    it("should save a message and return it", () => {
      const mockChats: LocalChat[] = [
        {
          id: "chat-1",
          title: "Test",
          model: "gpt-4",
          createdAt: 1000,
          updatedAt: 1000,
          isPinned: false,
        },
      ];

      // Setup mock to return chat for existence check (if needed) and handle message get/set
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "yurie_chats") return JSON.stringify(mockChats);
        if (key === "yurie_messages_chat-1") return JSON.stringify([]);
        return null;
      });

      const message: LocalMessage = {
        id: "msg-1",
        chatId: "chat-1",
        role: "user",
        content: "Hello",
        createdAt: Date.now(),
      };

      const result = saveMessage(message);

      expect(result).toEqual(message);

      // Check last call to setItem for messages
      const calls = localStorageMock.setItem.mock.calls;
      const messageCall = calls.find(
        (call) => call[0] === "yurie_messages_chat-1"
      );
      expect(messageCall).toBeDefined();

      const savedMessages = JSON.parse(messageCall![1]);
      expect(savedMessages).toHaveLength(1);
      expect(savedMessages[0].id).toBe("msg-1");
    });

    it("should update parent chat timestamp when saving message", () => {
      const mockChats: LocalChat[] = [
        {
          id: "chat-1",
          title: "Test",
          model: "gpt-4",
          createdAt: 1000,
          updatedAt: 1000,
          isPinned: false,
        },
      ];
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "yurie_chats") return JSON.stringify(mockChats);
        if (key === "yurie_messages_chat-1") return JSON.stringify([]);
        return null;
      });

      const message: LocalMessage = {
        id: "msg-1",
        chatId: "chat-1",
        role: "user",
        content: "Hello",
        createdAt: Date.now(),
      };

      saveMessage(message);

      // Verify chat was touched (updatedAt changed)
      const chatsCalls = localStorageMock.setItem.mock.calls.filter(
        (call) => call[0] === "yurie_chats"
      );
      expect(chatsCalls.length).toBeGreaterThan(0);

      const savedChats = JSON.parse(
        chatsCalls[chatsCalls.length - 1][1]
      ) as LocalChat[];
      expect(savedChats[0].updatedAt).toBeGreaterThan(1000);
    });
  });

  describe("deleteMessage", () => {
    it("should return false when message does not exist", () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
      const result = deleteMessage("chat-1", "non-existent");
      expect(result).toBe(false);
    });

    it("should delete the message and all subsequent messages in the same chat", () => {
      const mockMessages: LocalMessage[] = [
        {
          id: "msg-1",
          chatId: "chat-1",
          role: "user",
          content: "First",
          createdAt: 1000,
        },
        {
          id: "msg-2",
          chatId: "chat-1",
          role: "assistant",
          content: "Second",
          createdAt: 2000,
        },
        {
          id: "msg-3",
          chatId: "chat-1",
          role: "user",
          content: "Third",
          createdAt: 3000,
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockMessages));

      const result = deleteMessage("chat-1", "msg-2");

      expect(result).toBe(true);
      const savedMessages = JSON.parse(
        localStorageMock.setItem.mock.calls[0][1]
      ) as LocalMessage[];
      // Should keep msg-1 (before deleted). msg-2 and msg-3 are removed.
      expect(savedMessages).toHaveLength(1);
      expect(savedMessages.map((m) => m.id)).toEqual(["msg-1"]);
    });
  });

  describe("getSettings", () => {
    it("should return empty object when no settings exist", () => {
      const settings = getSettings();
      expect(settings).toEqual({});
    });

    it("should return settings from localStorage", () => {
      const mockSettings: LocalSettings = {
        preferredModel: "gpt-4",
        name: "Test User",
      };
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify(mockSettings)
      );

      const settings = getSettings();
      expect(settings).toEqual(mockSettings);
    });

    it("should return empty object when localStorage returns invalid JSON", () => {
      localStorageMock.getItem.mockReturnValueOnce("invalid json");
      const settings = getSettings();
      expect(settings).toEqual({});
    });

    it("should return empty object when window is undefined", () => {
      // @ts-expect-error
      delete global.window;
      const settings = getSettings();
      expect(settings).toEqual({});
    });
  });

  describe("updateSettings", () => {
    it("should merge new settings with existing ones", () => {
      const existingSettings: LocalSettings = {
        preferredModel: "gpt-4",
        name: "Test User",
      };
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSettings)
      );

      const result = updateSettings({ occupation: "Developer" });

      expect(result).toEqual({
        preferredModel: "gpt-4",
        name: "Test User",
        occupation: "Developer",
      });
    });

    it("should override existing settings with new values", () => {
      const existingSettings: LocalSettings = {
        preferredModel: "gpt-4",
      };
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSettings)
      );

      const result = updateSettings({ preferredModel: "claude-3" });

      expect(result.preferredModel).toBe("claude-3");
    });

    it("should handle window being undefined", () => {
      // @ts-expect-error
      delete global.window;
      const result = updateSettings({ name: "Test" });
      // Should still return the merged settings even if can't save
      expect(result.name).toBe("Test");
    });
  });

  describe("fromUIMessage", () => {
    it("should convert UIMessage to LocalMessage format", () => {
      const uiMessage: UIMessage = {
        id: "ui-msg-1",
        role: "user",
        parts: [{ type: "text", text: "Hello world" }],
      };

      const result = fromUIMessage(uiMessage, "chat-1");

      expect(result.id).toBe("ui-msg-1");
      expect(result.chatId).toBe("chat-1");
      expect(result.role).toBe("user");
      expect(result.content).toBe("Hello world");
      expect(result.parts).toEqual(uiMessage.parts);
      expect(result.createdAt).toBeDefined();
      expect(result.metadata).toEqual({});
    });

    it("should handle UIMessage without text parts", () => {
      const uiMessage: UIMessage = {
        id: "ui-msg-1",
        role: "assistant",
        parts: [],
      };

      const result = fromUIMessage(uiMessage, "chat-1");

      expect(result.content).toBe("");
    });

    it("should handle UIMessage with multiple parts", () => {
      const uiMessage: UIMessage = {
        id: "ui-msg-1",
        role: "user",
        parts: [
          { type: "text", text: "First text" },
          { type: "text", text: "Second text" },
        ],
      };

      const result = fromUIMessage(uiMessage, "chat-1");

      // Should take the first text part
      expect(result.content).toBe("First text");
    });
  });
});
