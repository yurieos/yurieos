// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatInitialization } from "../use-chat-initialization";

const mockPushState = vi.fn();
const mockUseSearchParams = vi.fn();
const mockUsePathname = vi.fn();
const mockUseUser = vi.fn();
const mockCreateChat = vi.fn();
const mockToast = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/providers/user-provider", () => ({
  useUser: () => mockUseUser(),
}));

vi.mock("@/lib/local-storage", () => ({
  createChat: (title: string, model: string) => mockCreateChat(title, model),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

vi.mock("../use-document-title", () => ({
  useDocumentTitle: vi.fn(),
}));

describe("useChatInitialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockUseSearchParams.mockReturnValue({ get: () => null });
    // IMPORTANT: Return a non-root path by default so optimistic ID is NOT cleared immediately
    mockUsePathname.mockReturnValue("/test-path");
    // Mock window.location.pathname to also be non-root
    Object.defineProperty(window, "location", {
      value: { pathname: "/test-path" },
      writable: true,
    });

    mockUseUser.mockReturnValue({ user: { _id: "user-1" }, isLoading: false });

    // Mock window.history.pushState
    vi.spyOn(window.history, "pushState").mockImplementation(mockPushState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with null activeChatId by default", () => {
    const { result } = renderHook(() => useChatInitialization(null));
    expect(result.current.activeChatId).toBeNull();
  });

  it("should use provided chatId as activeChatId", () => {
    const { result } = renderHook(() => useChatInitialization("chat-123"));
    expect(result.current.activeChatId).toBe("chat-123");
  });

  it("should set optimistic chat ID manually via return value", () => {
    const { result } = renderHook(() => useChatInitialization(null));

    act(() => {
      result.current.setOptimisticChatId("opt-123");
    });

    expect(result.current.activeChatId).toBe("opt-123");
  });

  it("should create chat via handleCreateChat", () => {
    mockCreateChat.mockReturnValue({ id: "new-chat-id" });
    const { result } = renderHook(() => useChatInitialization(null));

    const id = result.current.handleCreateChat("New Chat");

    expect(mockCreateChat).toHaveBeenCalledWith("New Chat", expect.any(String));
    expect(id).toBe("new-chat-id");
  });

  it("should process URL query param 'q' and start chat", async () => {
    // We start at home for this test to simulate landing on home with ?q=...
    // But we must be careful: if we just set pathname='/', optimistic ID will clear!
    // So we assume the flow is: Mount -> Process 'q' -> Set Optimistic ID -> Push State

    mockUseSearchParams.mockReturnValue({
      get: (key: string) => (key === "q" ? "test query" : null),
    });
    mockCreateChat.mockReturnValue({ id: "generated-id" });
    const sendMessageHelper = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useChatInitialization(null));

    await act(async () => {
      await result.current.checkAndRunQueryParam(sendMessageHelper);
    });

    expect(mockCreateChat).toHaveBeenCalledWith(
      "test query",
      expect.any(String)
    );
    expect(mockPushState).toHaveBeenCalledWith(null, "", "/c/generated-id");
    expect(sendMessageHelper).toHaveBeenCalledWith(
      "test query",
      "generated-id"
    );

    // Check optimistic update
    expect(result.current.activeChatId).toBe("generated-id");
  });

  it("should not process 'q' param if user is loading", async () => {
    mockUseSearchParams.mockReturnValue({
      get: (key: string) => (key === "q" ? "test query" : null),
    });
    mockUseUser.mockReturnValue({ user: null, isLoading: true });
    const sendMessageHelper = vi.fn();

    const { result } = renderHook(() => useChatInitialization(null));

    await act(async () => {
      await result.current.checkAndRunQueryParam(sendMessageHelper);
    });

    expect(mockCreateChat).not.toHaveBeenCalled();
  });

  it("should not process empty 'q' param", async () => {
    mockUseSearchParams.mockReturnValue({
      get: (key: string) => (key === "q" ? "   " : null),
    });
    const sendMessageHelper = vi.fn();

    const { result } = renderHook(() => useChatInitialization(null));

    await act(async () => {
      await result.current.checkAndRunQueryParam(sendMessageHelper);
    });

    expect(mockCreateChat).not.toHaveBeenCalled();
  });

  it("should clear optimistic ID when real chatId is provided", () => {
    const { result, rerender } = renderHook(
      ({ id }) => useChatInitialization(id),
      { initialProps: { id: null as string | null } }
    );

    act(() => {
      result.current.setOptimisticChatId("opt-id");
    });
    expect(result.current.activeChatId).toBe("opt-id");

    // Provide real ID
    rerender({ id: "real-id" });

    expect(result.current.activeChatId).toBe("real-id");
  });

  it("should clear optimistic ID when navigating to home", () => {
    const { result, rerender } = renderHook(() => useChatInitialization(null));

    act(() => {
      result.current.setOptimisticChatId("opt-id");
    });
    expect(result.current.activeChatId).toBe("opt-id");

    // Simulate navigation to home
    // We need to update window.location.pathname AND force a re-render
    // Since our hook depends on [pathname, optimisticChatId], changing window.location alone won't trigger it
    // UNLESS we trigger a re-render and the effect reads window.location.
    // However, our hook dependency is `pathname` (from usePathname).
    // So we must update mockUsePathname to trigger the effect.

    mockUsePathname.mockReturnValue("/");
    window.location.pathname = "/";

    // Trigger effect
    rerender();

    expect(result.current.activeChatId).toBeNull();
  });
});
