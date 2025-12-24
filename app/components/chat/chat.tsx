"use client";

import { type UIMessage, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { Space_Grotesk } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  Conversation,
  type MessageWithExtras,
} from "@/app/components/chat/conversation";
import { ChatInput } from "@/app/components/chat-input/chat-input";
import { useDocumentTitle } from "@/app/hooks/use-document-title";
import { useChatSession } from "@/app/providers/chat-session-provider";
import { useUser } from "@/app/providers/user-provider";
import { toast } from "@/components/ui/toast";
import {
  MODEL_DEFAULT,
  REASONING_EFFORT_DEFAULT,
  REASONING_EFFORTS,
  type ReasoningEffort,
} from "@/lib/config/constants";
import {
  createChat as createLocalChat,
  deleteMessage as deleteLocalMessage,
  fromUIMessage,
  getChat,
  getMessages,
  type LocalChat,
  type LocalMessage,
  saveMessage,
} from "@/lib/local-storage";
import { createPlaceholderId, validateInput } from "@/lib/message-utils";
import { supportsReasoningEffort } from "@/lib/model-utils";
import { TRANSITION_LAYOUT } from "@/lib/motion";
import { API_ROUTE_CHAT } from "@/lib/routes";
import { getUserTimezone } from "@/lib/user-utils";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

// Convert a File to a data URL (base64)
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Schema for chat body
const ChatBodySchema = z.object({
  chatId: z.string(),
  model: z.string(),
  reasoningEffort: z.enum(REASONING_EFFORTS).optional(),
  userInfo: z
    .object({
      timezone: z.string().optional(),
    })
    .optional(),
});

type ChatBody = z.infer<typeof ChatBodySchema>;

// Dynamic imports
const DialogAuth = dynamic(
  () => import("./dialog-auth").then((mod) => mod.DialogAuth),
  { ssr: false }
);

export default function Chat() {
  const { chatId, isDeleting, setIsDeleting } = useChatSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isUserLoading } = useUser();

  const [optimisticChatId, setOptimisticChatId] = useState<string | null>(null);
  const activeChatId = chatId ?? optimisticChatId;
  const activeChatIdRef = useRef<string | null>(activeChatId);
  const persistChatIdRef = useRef<string | null>(activeChatId);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    if (chatId) {
      setOptimisticChatId(null);
    }
  }, [chatId]);

  // Local state
  const [hasDialogAuth, setHasDialogAuth] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
    REASONING_EFFORT_DEFAULT
  );
  const [currentChat, setCurrentChat] = useState<LocalChat | null | undefined>(
    undefined
  );
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const processedUrl = useRef(false);

  // File attachment state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Load chat and messages from localStorage
  useEffect(() => {
    if (!activeChatId) {
      setCurrentChat(null);
      setLocalMessages([]);
      persistChatIdRef.current = null;
      return;
    }

    const chat = getChat(activeChatId);
    setCurrentChat(chat);

    if (!chat) {
      setLocalMessages([]);
      persistChatIdRef.current = null;
      return;
    }

    const msgs = getMessages(activeChatId);
    setLocalMessages(msgs);
    persistChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const [selectedModel, setSelectedModel] = useState(MODEL_DEFAULT);

  // Enhanced useChat hook with AI SDK best practices
  const { messages, status, regenerate, stop, setMessages, sendMessage } =
    useChat({
      transport: new DefaultChatTransport({
        api: API_ROUTE_CHAT,
        headers: {
          "Content-Type": "application/json",
        },
      }),
      onError: (error) => {
        console.error("Chat error:", error);
        toast({ title: "An error occurred", status: "error" });
      },
      onFinish: (finishData) => {
        // Save assistant message to localStorage when streaming finishes
        const chatIdToPersist =
          persistChatIdRef.current ?? activeChatIdRef.current;
        if (chatIdToPersist && finishData.message?.role === "assistant") {
          // Mark this chat as streamed to prevent hydration race condition
          streamedChatsRef.current.add(chatIdToPersist);

          const localMsg = fromUIMessage(finishData.message, chatIdToPersist);
          saveMessage(localMsg);

          // Update local messages state to prevent sync issues
          if (chatIdToPersist === activeChatIdRef.current) {
            setLocalMessages((prev) => [...prev, localMsg]);
          }
        }
      },
    });

  // Sync localStorage messages to chat state on mount
  const hydratedChatIdRef = useRef<string | null>(null);
  // Track chats that have been streamed to prevent hydration race condition
  const streamedChatsRef = useRef<Set<string>>(new Set());
  // Track previous chat ID to detect navigation between chats
  const previousChatIdRef = useRef<string | null>(null);
  // Track if we're in the middle of a chat switch and need to hydrate
  const pendingHydrationRef = useRef<string | null>(null);

  // Clear messages and reset state when switching between different chats
  useEffect(() => {
    const previousId = previousChatIdRef.current;
    const currentId = activeChatId;

    // Update the ref for next comparison
    previousChatIdRef.current = currentId;

    // If we're switching from one chat to another (not from/to home)
    if (previousId && currentId && previousId !== currentId) {
      // Mark that we're pending hydration for this chat
      pendingHydrationRef.current = currentId;
      // Clear messages immediately to prevent showing old chat's messages
      setMessages([]);
      // Reset hydration tracking so the new chat can be hydrated
      hydratedChatIdRef.current = null;
    }
  }, [activeChatId, setMessages]);

  useEffect(() => {
    if (!activeChatId || status !== "ready" || isDeleting) {
      return;
    }

    if (!currentChat || currentChat.id !== activeChatId) {
      return;
    }

    if (hydratedChatIdRef.current === activeChatId) {
      return;
    }

    // Skip hydration for chats that were just streamed - messages are already in useChat
    if (streamedChatsRef.current.has(activeChatId)) {
      hydratedChatIdRef.current = activeChatId;
      pendingHydrationRef.current = null;
      return;
    }

    // Check if we're waiting for hydration after a chat switch
    const isPendingHydration = pendingHydrationRef.current === activeChatId;

    // If not pending hydration and there are existing messages, skip
    // (These messages likely belong to the current chat from a fresh page load)
    if (!isPendingHydration && messages.length > 0) {
      hydratedChatIdRef.current = activeChatId;
      return;
    }

    // If pending hydration, wait for messages to be cleared before hydrating
    if (isPendingHydration && messages.length > 0) {
      // Messages haven't been cleared yet, wait for next render
      return;
    }

    const matchesActiveChat = localMessages.every(
      (msg) => msg.chatId === activeChatId
    );
    if (!matchesActiveChat) {
      return;
    }

    const uiMessages: UIMessage[] = localMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: msg.parts ?? [{ type: "text", text: msg.content }],
    }));

    setMessages(uiMessages);
    hydratedChatIdRef.current = activeChatId;
    pendingHydrationRef.current = null;
  }, [
    activeChatId,
    localMessages,
    messages.length,
    status,
    setMessages,
    isDeleting,
    currentChat,
  ]);

  // Reset state for new chats
  useEffect(() => {
    if ((status === "ready" || status === "error") && !activeChatId) {
      setMessages([]);
    }
  }, [status, activeChatId, setMessages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.location.pathname === "/" && optimisticChatId) {
      setOptimisticChatId(null);
    }
  }, [optimisticChatId]);

  // Create chat function
  const handleCreateChat = useCallback((title: string) => {
    const chat = createLocalChat(title, MODEL_DEFAULT);
    return chat.id;
  }, []);

  // Core message sending function
  const sendMessageHelper = useCallback(
    async (
      inputMessage: string,
      currentChatId?: string,
      files: File[] = []
    ) => {
      const chatIdToUse = currentChatId || activeChatId;
      if (!chatIdToUse) {
        return;
      }

      persistChatIdRef.current = chatIdToUse;

      const isReasoningModel = supportsReasoningEffort(selectedModel);
      const timezone = getUserTimezone();

      const body: ChatBody = {
        chatId: chatIdToUse,
        model: selectedModel,
        ...(isReasoningModel ? { reasoningEffort } : {}),
        ...(timezone ? { userInfo: { timezone } } : {}),
      };

      // Build message parts: text + file attachments
      type TextPart = { type: "text"; text: string };
      type FilePart = {
        type: "file";
        url: string;
        mediaType: string;
        filename: string;
      };
      type MessagePart = TextPart | FilePart;

      const messageParts: MessagePart[] = [];

      // Add text part if there's text content
      if (inputMessage.trim()) {
        messageParts.push({ type: "text" as const, text: inputMessage });
      }

      // Convert files to data URLs and add as file parts
      if (files.length > 0) {
        try {
          const fileParts = await Promise.all(
            files.map(async (file) => {
              const dataUrl = await fileToDataUrl(file);
              return {
                type: "file" as const,
                url: dataUrl,
                mediaType: file.type,
                filename: file.name,
              };
            })
          );
          messageParts.push(...fileParts);
        } catch {
          toast({ title: "Failed to process files", status: "error" });
          return;
        }
      }

      // Save user message to localStorage
      const userMessage: LocalMessage = {
        id: createPlaceholderId(),
        chatId: chatIdToUse,
        role: "user",
        content: inputMessage,
        parts: messageParts,
        createdAt: Date.now(),
        metadata: {},
      };
      saveMessage(userMessage);

      // Update local messages state to prevent sync issues
      if (chatIdToUse === activeChatId) {
        setLocalMessages((prev) => [...prev, userMessage]);
      }

      // Mark this chat as having active streaming to prevent hydration race condition
      streamedChatsRef.current.add(chatIdToUse);

      // Send message with AI SDK
      try {
        await sendMessage({ parts: messageParts, role: "user" }, { body });
      } catch {
        toast({ title: "Failed to send message", status: "error" });
      }
    },
    [activeChatId, selectedModel, reasoningEffort, sendMessage]
  );

  // URL parameter processing
  useEffect(() => {
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

      const startChat = async () => {
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
      };

      startChat();
    }
  }, [isUserLoading, user, searchParams, handleCreateChat, sendMessageHelper]);

  // Main submit handler
  const submit = useCallback(
    async (inputMessage: string) => {
      const filesToSend = [...pendingFiles];

      if (!validateInput(inputMessage, filesToSend.length, user?._id)) {
        return;
      }

      let currentChatId = activeChatId;

      // Create chat if needed - use message text or "Image analysis" for title
      const chatTitle =
        inputMessage.trim() || (filesToSend.length > 0 ? "Image analysis" : "");
      if (
        !currentChatId &&
        messages.length === 0 &&
        (inputMessage || filesToSend.length > 0)
      ) {
        currentChatId = handleCreateChat(chatTitle);
        if (!currentChatId) {
          return;
        }

        setOptimisticChatId(currentChatId);
        window.history.pushState(null, "", `/c/${currentChatId}`);
      }

      // Clear pending files before sending (optimistic update)
      setPendingFiles([]);

      await sendMessageHelper(
        inputMessage,
        currentChatId || undefined,
        filesToSend
      );
    },
    [
      user?._id,
      activeChatId,
      messages.length,
      handleCreateChat,
      sendMessageHelper,
      pendingFiles,
    ]
  );

  // Message handlers
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const handleDelete = useCallback(
    (id: string) => {
      const currentMessages = messagesRef.current;
      const originalMessages = [...currentMessages];
      const idx = originalMessages.findIndex((m) => m.id === id);

      if (idx === -1) {
        return;
      }

      const filteredMessages = originalMessages.slice(0, idx);
      setMessages(filteredMessages);
      setIsDeleting(true);

      try {
        deleteLocalMessage(id);
        setIsDeleting(false);

        // If we deleted all messages, redirect to home
        if (filteredMessages.length === 0 && activeChatId) {
          router.push("/");
        }
      } catch {
        setMessages(originalMessages);
        setIsDeleting(false);
      }
    },
    [router, setIsDeleting, setMessages, activeChatId]
  );

  const handleReload = useCallback(
    (messageId: string) => {
      if (!activeChatId) {
        return;
      }

      persistChatIdRef.current = activeChatId;

      const currentMessages = messagesRef.current;
      const originalMessages = [...currentMessages];
      const targetIdx = originalMessages.findIndex((m) => m.id === messageId);

      if (targetIdx === -1) {
        return;
      }

      const trimmedMessages = originalMessages.slice(0, targetIdx + 1);
      setMessages(trimmedMessages);

      const isReasoningModel = supportsReasoningEffort(selectedModel);
      const timezone = getUserTimezone();

      const options = {
        body: {
          chatId: activeChatId,
          model: selectedModel,
          reloadAssistantMessageId: messageId,
          ...(isReasoningModel ? { reasoningEffort } : {}),
          ...(timezone ? { userInfo: { timezone } } : {}),
        },
      };

      // Mark this chat as having active streaming to prevent hydration race condition
      streamedChatsRef.current.add(activeChatId);
      regenerate(options);
    },
    [activeChatId, selectedModel, reasoningEffort, setMessages, regenerate]
  );

  const handleEdit = useCallback(
    async (
      id: string,
      newText: string,
      editOptions: {
        model: string;
        files: File[];
        reasoningEffort: ReasoningEffort;
        removedFileUrls?: string[];
      }
    ) => {
      if (!activeChatId) {
        return;
      }

      persistChatIdRef.current = activeChatId;

      const originalMessages = [...messagesRef.current];
      const targetIdx = originalMessages.findIndex((m) => m.id === id);

      if (targetIdx === -1) {
        return;
      }

      // Update message content
      setMessages((currentMsgs) => {
        const editTargetIdx = currentMsgs.findIndex((m) => m.id === id);
        if (editTargetIdx === -1) {
          return currentMsgs;
        }

        return currentMsgs.slice(0, editTargetIdx + 1).map((msg, idx) => {
          if (idx !== editTargetIdx) {
            return msg;
          }

          return {
            ...msg,
            parts: [{ type: "text" as const, text: newText }],
          };
        });
      });

      // Trigger AI regeneration
      const isEditReasoningModel = supportsReasoningEffort(selectedModel);
      const timezone = getUserTimezone();

      const options = {
        body: {
          chatId: activeChatId,
          model: selectedModel,
          editMessageId: id,
          ...(isEditReasoningModel
            ? { reasoningEffort: editOptions.reasoningEffort }
            : {}),
          ...(timezone ? { userInfo: { timezone } } : {}),
        },
      };

      // Mark this chat as having active streaming to prevent hydration race condition
      streamedChatsRef.current.add(activeChatId);

      try {
        await regenerate(options);
      } catch {
        setMessages(originalMessages);
        toast({
          title: "Failed to update message",
          status: "error",
        });
      }
    },
    [activeChatId, selectedModel, setMessages, regenerate]
  );

  // Branch is not supported in local mode
  const handleBranch = useCallback(() => {
    toast({
      title: "Branching is not available in local mode",
      status: "info",
    });
  }, []);

  // File handlers
  const handleFileUpload = useCallback((files: File[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileRemove = useCallback((file: File) => {
    setPendingFiles((prev) => prev.filter((f) => f !== file));
  }, []);

  // Chat redirect effect
  useEffect(() => {
    if (!isUserLoading && chatId && currentChat === null && !isDeleting) {
      router.replace("/");
    }
  }, [chatId, currentChat, isUserLoading, router, isDeleting]);

  // Document title update
  useDocumentTitle(currentChat?.title, activeChatId || undefined);

  // Message scrolling
  const targetMessageId = searchParams.get("m");
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (targetMessageId) {
      hasScrolledRef.current = false;
    }
  }, [targetMessageId]);

  useEffect(() => {
    if (!targetMessageId || hasScrolledRef.current || messages.length === 0) {
      return;
    }
    const el = document.getElementById(targetMessageId);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      hasScrolledRef.current = true;
    }
  }, [targetMessageId, messages]);

  // Early return for redirect
  if (currentChat === null && chatId) {
    return null;
  }

  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col items-center",
        activeChatId || messages.length > 0
          ? "justify-start"
          : "justify-center pb-32"
      )}
    >
      <DialogAuth open={hasDialogAuth} setOpen={setHasDialogAuth} />

      <AnimatePresence initial={false} mode="popLayout">
        {!activeChatId && messages.length === 0 ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="relative mx-auto max-w-[50rem] px-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="onboarding"
            layout="position"
            layoutId="onboarding"
            transition={{ layout: { duration: 0 } }}
          >
            <h1
              className={cn(
                "mb-8 font-medium text-4xl tracking-tight",
                spaceGrotesk.className
              )}
            >
              yurie
            </h1>
          </motion.div>
        ) : (
          <Conversation
            autoScroll={!targetMessageId}
            isReasoningModel={supportsReasoningEffort(selectedModel)}
            isUserAuthenticated={true}
            key="conversation"
            messages={messages as MessageWithExtras[]}
            onBranch={handleBranch}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReload={handleReload}
            reasoningEffort={reasoningEffort}
            selectedModel={selectedModel}
            status={status}
          />
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl"
        )}
        layout="position"
        layoutId="chat-input-container"
        transition={{
          layout: {
            ...TRANSITION_LAYOUT,
            duration: messages.length === 1 ? 0.2 : 0,
          },
        }}
      >
        <ChatInput
          files={pendingFiles}
          hasSuggestions={!activeChatId && messages.length === 0}
          isReasoningModel={supportsReasoningEffort(selectedModel)}
          isSubmitting={status === "streaming"}
          isUserAuthenticated={true}
          onFileRemoveAction={handleFileRemove}
          onFileUploadAction={handleFileUpload}
          onSelectModelAction={setSelectedModel}
          onSelectReasoningEffortAction={setReasoningEffort}
          onSendAction={submit}
          onSuggestionAction={submit}
          reasoningEffort={reasoningEffort}
          selectedModel={selectedModel}
          status={status}
          stopAction={stop}
        />
      </motion.div>
    </div>
  );
}
