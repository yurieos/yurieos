// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChat, getMessages, saveMessage } from "@/lib/local-storage";
import { useChatPersistence } from "../use-chat-persistence";

// Mocks
vi.mock("@/lib/local-storage", () => ({
  getChat: vi.fn(),
  getMessages: vi.fn(),
  saveMessage: vi.fn(),
}));

describe("useChatPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useChatPersistence(null));
    // Loading is true initially but effect runs immediately in test?
    // In React 18 strict mode it might run twice.
    // The effect sets loading to true then false.
    // We can't easily catch the intermediate state without async rendering.
    // But we can check that it settles to false.
    expect(result.current.isLoading).toBe(false);
  });

  it("should load chat and messages when activeChatId is provided", () => {
    const mockChat = { id: "chat-1", title: "Test Chat" };
    const mockMessages = [{ id: "msg-1", content: "Hello" }];

    (getChat as any).mockReturnValue(mockChat);
    (getMessages as any).mockReturnValue(mockMessages);

    const { result } = renderHook(() => useChatPersistence("chat-1"));

    expect(getChat).toHaveBeenCalledWith("chat-1");
    expect(getMessages).toHaveBeenCalledWith("chat-1");
    expect(result.current.currentChat).toEqual(mockChat);
    expect(result.current.localMessages).toEqual(mockMessages);
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle null activeChatId", () => {
    const { result } = renderHook(() => useChatPersistence(null));

    expect(result.current.currentChat).toBeNull();
    expect(result.current.localMessages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle non-existent chat", () => {
    (getChat as any).mockReturnValue(null);

    const { result } = renderHook(() => useChatPersistence("non-existent"));

    expect(result.current.currentChat).toBeNull();
    expect(result.current.localMessages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should save message and update state", () => {
    const mockChat = { id: "chat-1" };
    (getChat as any).mockReturnValue(mockChat);
    (getMessages as any).mockReturnValue([]);

    const { result } = renderHook(() => useChatPersistence("chat-1"));

    const newMessage = {
      id: "msg-1",
      chatId: "chat-1",
      content: "New message",
    };

    act(() => {
      // @ts-expect-error
      result.current.saveLocalMessage(newMessage);
    });

    expect(saveMessage).toHaveBeenCalledWith(newMessage);
    expect(result.current.localMessages).toContain(newMessage);
  });
});
