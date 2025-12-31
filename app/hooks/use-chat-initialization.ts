import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/app/providers/user-provider";
import { toast } from "@/components/ui/toast";
import { MODEL_DEFAULT } from "@/lib/config/constants";
import { createChat as createLocalChat } from "@/lib/local-storage";
import { useDocumentTitle } from "./use-document-title";

export function useChatInitialization(
  chatId: string | null,
  currentChatTitle?: string
) {
  const searchParams = useSearchParams();
  const _pathname = usePathname();
  const { user, isLoading: isUserLoading } = useUser();
  const [optimisticChatId, setOptimisticChatId] = useState<string | null>(null);

  const processedUrl = useRef(false);

  // Sync activeChatId with optimistic updates
  const activeChatId = chatId ?? optimisticChatId;

  // Create chat function
  const handleCreateChat = useCallback((title: string) => {
    const chat = createLocalChat(title, MODEL_DEFAULT);
    return chat.id;
  }, []);

  // Handle URL query parameter ?q=...
  const checkAndRunQueryParam = useCallback(
    async (sendMessageHelper: (query: string, id: string) => Promise<void>) => {
      if (isUserLoading || !user || processedUrl.current) {
        return;
      }

      const query = searchParams.get("q");

      if (query) {
        processedUrl.current = true;

        const trimmedQuery = query.trim().substring(0, 1000);
        if (!trimmedQuery) {
          return;
        }

        try {
          const newChatId = handleCreateChat(trimmedQuery);
          if (newChatId) {
            setOptimisticChatId(newChatId);
            window.history.pushState(null, "", `/c/${newChatId}`);
            await sendMessageHelper(trimmedQuery, newChatId);
          }
        } catch {
          toast({ title: "Failed to create chat", status: "error" });
        }
      }
    },
    [isUserLoading, user, searchParams, handleCreateChat]
  );

  // Reset optimistic ID when real ID is available
  useEffect(() => {
    if (chatId) {
      setOptimisticChatId(null);
    }
  }, [chatId]);

  // Reset optimistic ID on navigation to home
  useEffect(() => {
    // Only reset if we are TRULY on home, not just what Next.js thinks
    if (window.location.pathname === "/" && optimisticChatId) {
      setOptimisticChatId(null);
    }
  }, [optimisticChatId]);

  // Document title update
  useDocumentTitle(currentChatTitle, activeChatId || undefined);

  return {
    activeChatId,
    setOptimisticChatId,
    handleCreateChat,
    checkAndRunQueryParam,
  };
}
