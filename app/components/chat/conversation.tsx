import type { UIMessage } from "@ai-sdk/react";
import React, { useRef } from "react";
import { ScrollButton } from "@/components/motion-primitives/scroll-button";
import { ChatContainer } from "@/components/prompt-kit/chat-container";
import { Loader } from "@/components/prompt-kit/loader";
import {
  REASONING_EFFORT_DEFAULT,
  type ReasoningEffort,
} from "@/lib/config/constants";
import { Message } from "./message";

export type MessageWithExtras = UIMessage & {
  model?: string;
  metadata?: {
    modelId?: string;
    modelName?: string;
    includeSearch?: boolean;
    reasoningEffort?: string;
  };
};

type ConversationProps = {
  messages: MessageWithExtras[];
  status?: "streaming" | "ready" | "submitted" | "error";
  onDelete: (id: string) => void;
  onEdit: (
    id: string,
    newText: string,
    options: {
      model: string;
      files: File[];
      reasoningEffort: ReasoningEffort;
      removedFileUrls?: string[];
    }
  ) => void;
  onReload: (id: string) => void;
  onBranch: (messageId: string) => void;
  autoScroll?: boolean;
  selectedModel?: string;
  isUserAuthenticated?: boolean;
  isReasoningModel?: boolean;
  reasoningEffort?: ReasoningEffort;
};

const Conversation = React.memo(
  ({
    messages,
    status = "ready",
    onDelete,
    onEdit,
    onReload,
    onBranch,
    autoScroll = true,
    selectedModel,
    isUserAuthenticated = false,
    isReasoningModel = false,
    reasoningEffort = REASONING_EFFORT_DEFAULT,
  }: ConversationProps) => {
    const initialMessageCount = useRef(messages.length);
    const containerRef = useRef<HTMLDivElement>(null);

    if (!messages || messages.length === 0) {
      return <div className="h-full w-full" />;
    }

    // console.log('Rendering messages:', messages);

    return (
      <div className="relative flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <ChatContainer
          autoScroll={autoScroll}
          className="relative flex w-full flex-col items-center py-4"
          ref={containerRef}
        >
          {messages?.map((message, index) => {
            const isLast = index === messages.length - 1;
            const hasScrollAnchor =
              isLast && messages.length > initialMessageCount.current;
            const messageStatus = isLast ? status : "ready";

            return (
              <Message
                hasScrollAnchor={hasScrollAnchor}
                id={message.id}
                isLast={isLast}
                isReasoningModel={isReasoningModel}
                isUserAuthenticated={isUserAuthenticated}
                key={message.id}
                metadata={message.metadata}
                model={message.model}
                onBranch={() => onBranch(message.id)}
                onDelete={onDelete}
                onEdit={onEdit}
                onReload={() => onReload(message.id)}
                parts={message.parts}
                reasoningEffort={reasoningEffort}
                selectedModel={selectedModel}
                status={messageStatus}
                variant={message.role}
              />
            );
          })}
          {status === "submitted" &&
            messages.length > 0 &&
            messages.at(-1)?.role === "user" && (
              <div className="group flex min-h-scroll-anchor w-full max-w-3xl flex-col items-start gap-2 px-6 pb-2">
                <Loader size="md" variant="dots" />
              </div>
            )}
        </ChatContainer>
        <div className="absolute bottom-0 w-full max-w-3xl">
          <ScrollButton
            className="absolute top-[-50px] right-[30px]"
            containerRef={containerRef}
          />
        </div>
      </div>
    );
  }
);

export { Conversation };
