import { useCallback, useEffect, useRef, useState } from "react";
import {
  getChat,
  getMessages,
  type LocalChat,
  type LocalMessage,
  saveMessage,
} from "@/lib/local-storage";

export function useChatPersistence(activeChatId: string | null) {
  // Initialize with loading state to prevent premature redirects
  const [isLoading, setIsLoading] = useState(true);
  const [currentChat, setCurrentChat] = useState<LocalChat | null | undefined>(
    undefined
  );
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const persistChatIdRef = useRef<string | null>(null);

  // Keep a ref to activeChatId for stable callbacks
  const activeChatIdRef = useRef(activeChatId);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Load chat and messages from localStorage
  useEffect(() => {
    setIsLoading(true);

    if (!activeChatId) {
      setCurrentChat(null);
      setLocalMessages([]);
      persistChatIdRef.current = null;
      setIsLoading(false);
      return;
    }

    const chat = getChat(activeChatId);
    setCurrentChat(chat);

    if (!chat) {
      setLocalMessages([]);
      persistChatIdRef.current = null;
      setIsLoading(false);
      return;
    }

    const msgs = getMessages(activeChatId);
    setLocalMessages(msgs);
    persistChatIdRef.current = activeChatId;
    setIsLoading(false);
  }, [activeChatId]);

  const saveLocalMessage = useCallback((message: LocalMessage) => {
    saveMessage(message);
    // Update local messages state to prevent sync issues if it's the active chat
    if (message.chatId === activeChatIdRef.current) {
      setLocalMessages((prev) => [...prev, message]);
    }
  }, []);

  return {
    currentChat,
    localMessages,
    setLocalMessages,
    saveLocalMessage,
    persistChatIdRef,
    isLoading,
  };
}
