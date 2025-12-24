import type { UIMessage as MessageType } from "@ai-sdk/react";
import React, { useCallback, useState } from "react";
import {
  REASONING_EFFORT_DEFAULT,
  type ReasoningEffort,
} from "@/lib/config/constants";
import { MessageAssistant } from "./message-assistant";
import { MessageUser } from "./message-user";

type MessageProps = {
  variant: MessageType["role"];
  model?: string;
  id: string;
  isLast?: boolean;
  readOnly?: boolean;
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
  onReload: () => void;
  onBranch: () => void;
  hasScrollAnchor?: boolean;
  parts?: MessageType["parts"];
  status?: "streaming" | "ready" | "submitted" | "error"; // Add status prop
  metadata?: {
    modelId?: string;
    modelName?: string;
    includeSearch?: boolean;
    reasoningEffort?: string;
  };
  selectedModel?: string;
  isUserAuthenticated?: boolean;
  isReasoningModel?: boolean;
  reasoningEffort?: ReasoningEffort;
};

function MessageComponent({
  variant,
  model,
  id,
  isLast,
  readOnly,
  onDelete,
  onEdit,
  onReload,
  onBranch,
  hasScrollAnchor,
  parts,
  status, // Receive status prop
  metadata,
  selectedModel,
  isUserAuthenticated = false,
  isReasoningModel = false,
  reasoningEffort = REASONING_EFFORT_DEFAULT,
}: MessageProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(() => {
    // Extract text content from parts for copying
    const textContent =
      parts
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("") || "";
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 500);
  }, [parts]);

  if (variant === "user") {
    return (
      <MessageUser
        copied={copied}
        copyToClipboard={copyToClipboard}
        editFiles={[]}
        hasScrollAnchor={hasScrollAnchor}
        id={id}
        isReasoningModel={isReasoningModel}
        isUserAuthenticated={isUserAuthenticated}
        onDelete={onDelete}
        onEdit={onEdit}
        parts={parts}
        readOnly={readOnly}
        reasoningEffort={reasoningEffort}
        selectedModel={model || selectedModel || ""}
        status={status}
      />
    );
  }

  if (variant === "assistant") {
    return (
      <MessageAssistant
        copied={copied}
        copyToClipboard={copyToClipboard}
        hasScrollAnchor={hasScrollAnchor}
        id={id}
        isLast={isLast}
        metadata={metadata}
        model={model}
        onBranch={onBranch}
        onReload={onReload}
        parts={parts}
        readOnly={readOnly}
        status={status}
      />
    );
  }

  return null;
}

// Custom comparator to ignore handler prop changes
const equalMessage = (a: MessageProps, b: MessageProps) =>
  a.id === b.id &&
  a.variant === b.variant &&
  a.isLast === b.isLast &&
  a.hasScrollAnchor === b.hasScrollAnchor &&
  a.model === b.model &&
  a.readOnly === b.readOnly &&
  a.status === b.status &&
  a.metadata === b.metadata &&
  a.selectedModel === b.selectedModel &&
  a.isUserAuthenticated === b.isUserAuthenticated &&
  a.isReasoningModel === b.isReasoningModel &&
  a.reasoningEffort === b.reasoningEffort &&
  a.parts === b.parts &&
  a.onDelete === b.onDelete &&
  a.onEdit === b.onEdit;
// Intentionally ignore: onReload, onBranch (their identities change but logic doesn't)

export const Message = React.memo(MessageComponent, equalMessage);
Message.displayName = "Message";
