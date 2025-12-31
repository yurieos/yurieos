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
import { fileToDataUrl, useChatFiles } from "@/app/hooks/use-chat-files";
import { useChatInitialization } from "@/app/hooks/use-chat-initialization";
import { useChatPersistence } from "@/app/hooks/use-chat-persistence";
import { useChatSession } from "@/app/providers/chat-session-provider";
import { useUser } from "@/app/providers/user-provider";
import { toast } from "@/components/ui/toast";
import {
  MODEL_DEFAULT,
  REASONING_EFFORT_DEFAULT,
  REASONING_EFFORTS,
  type ReasoningEffort,
} from "@/lib/config/constants";
import { createStreamingError } from "@/lib/error-utils";
import {
  deleteMessage as deleteLocalMessage,
  fromUIMessage,
  type LocalMessage,
} from "@/lib/local-storage";
import { createPlaceholderId, validateInput } from "@/lib/message-utils";
import { supportsReasoningEffort } from "@/lib/model-utils";
import { TRANSITION_LAYOUT } from "@/lib/motion";
import { API_ROUTE_CHAT } from "@/lib/routes";
import { getUserTimezone } from "@/lib/user-utils";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

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

  // Custom Hooks
  const { pendingFiles, handleFileUpload, handleFileRemove, clearFiles } =
    useChatFiles();

  // Local state
  const [hasDialogAuth, setHasDialogAuth] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
    REASONING_EFFORT_DEFAULT
  );
  const [selectedModel, setSelectedModel] = useState(MODEL_DEFAULT);

  // Initialization Hook (handles URL params and optimistic ID)
  // We need currentChat for document title, but it's fetched inside useChatPersistence.
  // We'll pass a placeholder title or update it via effect if needed, but useChatInitialization
  // handles the hook call for us.
  const {
    activeChatId,
    setOptimisticChatId,
    handleCreateChat,
    checkAndRunQueryParam,
  } = useChatInitialization(chatId, undefined);

  // Persistence Hook
  const {
    currentChat,
    localMessages,
    saveLocalMessage,
    persistChatIdRef,
    isLoading: isChatLoading,
  } = useChatPersistence(activeChatId);

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

        // Use standardized error handling
        const { errorPayload } = createStreamingError(error);
        const errorMessage = errorPayload.error.message;

        toast({
          title: "An error occurred",
          description: errorMessage,
          status: "error",
        });
      },
      onFinish: (finishData) => {
        // Save assistant message to localStorage when streaming finishes
        const chatIdToPersist =
          persistChatIdRef.current ?? activeChatIdRef.current;
        if (chatIdToPersist && finishData.message?.role === "assistant") {
          // Mark this chat as streamed to prevent hydration race condition
          streamedChatsRef.current.add(chatIdToPersist);

          const localMsg = fromUIMessage(finishData.message, chatIdToPersist);
          saveLocalMessage(localMsg);
        }
      },
    });

  // Refs for stable access in effects/callbacks
  const activeChatIdRef = useRef<string | null>(activeChatId);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

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

    const uiMessages = localMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: msg.parts ?? [{ type: "text", text: msg.content }],
    })) as UIMessage[];

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
      try {
        saveLocalMessage(userMessage);
      } catch (error) {
        toast({
          title: "Failed to save message",
          description: "Your local storage might be full.",
          status: "error",
        });
        console.error("Failed to save message:", error);
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
    [
      activeChatId,
      selectedModel,
      reasoningEffort,
      sendMessage,
      persistChatIdRef,
      saveLocalMessage,
    ]
  );

  // Trigger URL param check
  useEffect(() => {
    // Wrap helper to match expected signature for hook
    const helper = (q: string, id: string) => sendMessageHelper(q, id, []);
    checkAndRunQueryParam(helper);
  }, [checkAndRunQueryParam, sendMessageHelper]);

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
      clearFiles();

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
      setOptimisticChatId,
      clearFiles,
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
        if (activeChatId) {
          deleteLocalMessage(activeChatId, id);
        }
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
    [
      activeChatId,
      selectedModel,
      reasoningEffort,
      setMessages,
      regenerate,
      persistChatIdRef,
    ]
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
    [activeChatId, selectedModel, setMessages, regenerate, persistChatIdRef]
  );

  // Branch is not supported in local mode
  const handleBranch = useCallback(() => {
    toast({
      title: "Branching is not available in local mode",
      status: "info",
    });
  }, []);

  // Chat redirect effect
  useEffect(() => {
    if (
      !(isUserLoading || isChatLoading) &&
      chatId &&
      currentChat === null &&
      !isDeleting
    ) {
      router.replace("/");
    }
  }, [chatId, currentChat, isUserLoading, isChatLoading, router, isDeleting]);

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

  const hasMessages = activeChatId || messages.length > 0;

  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col overflow-hidden",
        hasMessages ? "justify-start" : "items-center justify-center"
      )}
    >
      <DialogAuth open={hasDialogAuth} setOpen={setHasDialogAuth} />

      <AnimatePresence initial={false} mode="popLayout">
        {hasMessages ? (
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
        ) : (
          <motion.div
            animate={{ opacity: 1 }}
            className="relative mx-auto mb-20 flex w-full max-w-[50rem] flex-col items-center px-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="onboarding"
            layout="position"
            layoutId="onboarding"
            transition={{ layout: { duration: 0 } }}
          >
            <h1
              className={cn(
                "mb-4 text-center font-medium text-4xl tracking-tight",
                spaceGrotesk.className
              )}
            >
              yurie
            </h1>
            <ChatInput
              files={pendingFiles}
              hasSuggestions={true}
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
        )}
      </AnimatePresence>

      {/* Sticky input area at bottom when there are messages */}
      {hasMessages && (
        <motion.div
          className="sticky inset-x-0 bottom-0 z-50 w-full border-border/40 border-t bg-background/95 backdrop-blur-sm"
          layout="position"
          layoutId="chat-input-container"
          transition={{
            layout: {
              ...TRANSITION_LAYOUT,
              duration: messages.length === 1 ? 0.2 : 0,
            },
          }}
        >
          <div className="mx-auto w-full max-w-3xl">
            <ChatInput
              files={pendingFiles}
              hasSuggestions={false}
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
          </div>
        </motion.div>
      )}
    </div>
  );
}
