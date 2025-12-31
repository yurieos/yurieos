"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const TRAILING_SLASH_REGEX = /\/$/;

type ChatSessionContextType = {
  chatId: string | null;
  isDeleting: boolean;
  setIsDeleting: Dispatch<SetStateAction<boolean>>;
};

const ChatSessionContext = createContext<ChatSessionContextType>({
  chatId: null,
  isDeleting: false,
  setIsDeleting: () => {
    // Default no-op function
  },
});

export const useChatSession = () => useContext(ChatSessionContext);

export function ChatSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isDeleting, setIsDeleting] = useState(false);

  const chatId = useMemo(() => {
    if (pathname?.startsWith("/c/")) {
      const id = pathname.split("/c/")[1];
      return id.replace(TRAILING_SLASH_REGEX, ""); // Remove trailing slash if present
    }
    return null;
  }, [pathname]);

  // When the chat page changes, reset the deleting state
  // This handles cases where a user navigates away before a delete operation finishes
  // or if the state gets stuck.
  // biome-ignore lint/correctness/useExhaustiveDependencies: <see above comment>
  useEffect(() => {
    setIsDeleting(false);
  }, [chatId]);

  const contextValue = useMemo(
    () => ({
      chatId,
      isDeleting,
      setIsDeleting,
    }),
    [chatId, isDeleting]
  );

  return (
    <ChatSessionContext.Provider value={contextValue}>
      {children}
    </ChatSessionContext.Provider>
  );
}
