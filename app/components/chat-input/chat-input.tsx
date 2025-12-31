"use client";

import { CornerRightUp, Plus, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { toast } from "@/components/ui/toast";
import type { ReasoningEffort } from "@/lib/config/constants";
import {
  getAllowedLabel,
  PASTE_ALLOWED_MIME,
  UPLOAD_ALLOWED_MIME,
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_LABEL,
} from "@/lib/config/upload";
import { cn } from "@/lib/utils";
import { FileList } from "./file-list";
import { PromptSystem } from "./prompt-system";
import { SelectModel } from "./select-model";
import { SelectReasoningEffort } from "./select-reasoning-effort";

type ChatInputProps = {
  onSendAction: (message: string) => void;
  isSubmitting?: boolean;
  hasMessages?: boolean;
  files: File[];
  onFileUploadAction: (files: File[]) => void;
  onFileRemoveAction: (file: File) => void;
  onSuggestionAction: (suggestion: string) => void;
  hasSuggestions?: boolean;
  selectedModel: string;
  onSelectModelAction: (modelId: string) => void;
  isUserAuthenticated: boolean;
  stopAction: () => void;
  status?: "submitted" | "streaming" | "ready" | "error";
  isReasoningModel: boolean;
  reasoningEffort: ReasoningEffort;
  onSelectReasoningEffortAction: (reasoningEffort: ReasoningEffort) => void;
  initialValue?: string;
};

export function ChatInput({
  onSendAction,
  isSubmitting,
  files,
  onFileUploadAction,
  onFileRemoveAction,
  onSuggestionAction,
  hasSuggestions,
  selectedModel,
  onSelectModelAction,
  isUserAuthenticated,
  stopAction,
  status,
  isReasoningModel,
  reasoningEffort,
  onSelectReasoningEffortAction,
  initialValue = "",
}: ChatInputProps) {
  // Local state for input value to prevent parent re-renders
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update local value when initialValue changes (e.g., when using suggestions)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSubmitting) {
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // Allow submission if there's text or files
        const hasTextContent = value.trim().length > 0;
        const hasFiles = files.length > 0;
        if (!(hasTextContent || hasFiles)) {
          return;
        }
        onSendAction(value);
        setValue(""); // Clear input after sending
      }
    },
    [onSendAction, isSubmitting, value, files.length]
  );

  const handleMainClick = () => {
    if (status === "streaming") {
      stopAction();
      return;
    }

    // Allow submission if there's text or files
    const hasTextContent = value.trim().length > 0;
    const hasFiles = files.length > 0;

    if (isSubmitting || !(hasTextContent || hasFiles)) {
      // Prevent double submission or empty submission
      return;
    }

    onSendAction(value);
    setValue(""); // Clear input after sending
  };

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setValue(suggestion);
      onSuggestionAction(suggestion);
    },
    [onSuggestionAction]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) {
        return;
      }

      // Check if there are any file items in the clipboard (not just text)
      const hasFiles = Array.from(items).some((item) => item.kind === "file");
      // If user is not authenticated and trying to paste files, prevent it
      if (!isUserAuthenticated && hasFiles) {
        e.preventDefault();
        return;
      }

      // If no files or user is authenticated, allow default text paste behavior
      if (!hasFiles) {
        return;
      }

      // Handle image pasting for authenticated users
      const imageFiles: File[] = [];
      const allowed = new Set<string>(PASTE_ALLOWED_MIME as readonly string[]);
      let hadInvalidType = false;
      let hadTooLarge: { size: number } | null = null;

      for (const item of Array.from(items)) {
        if (item.type && allowed.has(item.type)) {
          const file = item.getAsFile();
          if (file) {
            if (file.size > UPLOAD_MAX_BYTES) {
              hadTooLarge = { size: file.size };
              continue;
            }
            const newFile = new File(
              [file],
              `pasted-image-${Date.now()}.${file.type.split("/")[1]}`,
              { type: file.type }
            );
            imageFiles.push(newFile);
          }
        } else if (item.type.startsWith("image/")) {
          hadInvalidType = true;
        }
      }

      if (imageFiles.length > 0) {
        onFileUploadAction(imageFiles);
      } else {
        // If there were image items but none matched allowed types, show feedback
        const hadAnyImages = Array.from(items).some((it) =>
          it.type.startsWith("image/")
        );
        if (hadAnyImages) {
          e.preventDefault();
          if (hadTooLarge) {
            toast({
              title: "File too large",
              description: `Max ${UPLOAD_MAX_LABEL} per file`,
              status: "error",
            });
          } else if (hadInvalidType) {
            toast({
              title: "File not supported",
              description: `Allowed: ${getAllowedLabel(Array.from(allowed))}`,
              status: "error",
            });
          }
        }
      }
    },
    [isUserAuthenticated, onFileUploadAction]
  );

  // Handle file input selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) {
        return;
      }

      const allowed = new Set<string>(UPLOAD_ALLOWED_MIME as readonly string[]);
      const validFiles: File[] = [];
      let hadInvalidType = false;
      let hadTooLarge = false;

      for (const file of Array.from(selectedFiles)) {
        if (!allowed.has(file.type)) {
          hadInvalidType = true;
          continue;
        }
        if (file.size > UPLOAD_MAX_BYTES) {
          hadTooLarge = true;
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        onFileUploadAction(validFiles);
      }

      // Show error toasts for invalid files
      if (hadTooLarge) {
        toast({
          title: "File too large",
          description: `Max ${UPLOAD_MAX_LABEL} per file`,
          status: "error",
        });
      }
      if (hadInvalidType) {
        toast({
          title: "File not supported",
          description: `Allowed: ${getAllowedLabel(Array.from(allowed))}`,
          status: "error",
        });
      }

      // Reset file input to allow selecting the same file again
      e.target.value = "";
    },
    [onFileUploadAction]
  );

  // Open file picker
  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.addEventListener("paste", handlePaste);
    return () => el.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // Auto-focus on typing: focus the textarea when user starts typing
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if input is already focused or disabled
      if (isSubmitting || !textareaRef.current) {
        return;
      }

      // Don't steal focus if another input element is already focused
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        (activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Don't focus on modifier keys, function keys, or special keys
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Only focus on printable characters (exclude special keys)
      const isPrintableChar =
        e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

      if (isPrintableChar && textareaRef.current) {
        // Focus the textarea and let the character be typed normally
        textareaRef.current.focus();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isSubmitting]);

  // Compute tooltip text without nested ternary expressions
  let tooltipText = "Send";
  if (status === "streaming") {
    tooltipText = "Stop";
  } else if (isSubmitting && files.length > 0) {
    tooltipText = "Uploading...";
  }

  // Compute send button styles
  const isStreaming = status === "streaming" || status === "submitted";
  const hasContent = value.trim() || files.length > 0;
  let sendButtonStyles =
    "border border-border/50 bg-transparent text-muted-foreground dark:bg-input/30";
  if (isStreaming) {
    sendButtonStyles =
      "border-destructive/50 bg-destructive/15 text-destructive hover:bg-destructive/25";
  } else if (hasContent) {
    sendButtonStyles =
      "border-transparent bg-foreground text-background hover:bg-foreground/90";
  }

  return (
    <div className="relative flex w-full flex-col gap-3">
      {hasSuggestions && (
        <PromptSystem
          inputValue={value}
          onSuggestion={handleSuggestionClick}
          onValueChange={setValue}
        />
      )}
      <div className="relative order-1 py-2">
        <PromptInput
          className="relative z-10 backdrop-blur-xl"
          maxHeight={200}
          onValueChange={setValue}
          value={value}
        >
          <FileList files={files} onFileRemoveAction={onFileRemoveAction} />
          <PromptInputTextarea
            className="text-foreground leading-[1.3] md:text-base"
            disabled={isSubmitting}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            ref={textareaRef}
          />
          <PromptInputActions className="mt-0.5 w-full justify-between">
            <div className="flex gap-2">
              {/* Hidden file input */}
              <input
                accept={UPLOAD_ALLOWED_MIME.join(",")}
                aria-hidden="true"
                className="hidden"
                multiple
                onChange={handleFileSelect}
                ref={fileInputRef}
                tabIndex={-1}
                type="file"
              />
              {/* Attach file button */}
              <PromptInputAction tooltip="Attach file">
                <motion.button
                  aria-label="Attach file"
                  className={cn(
                    "group flex size-8 items-center justify-center rounded-full border font-medium text-sm transition-all duration-300 ease-out",
                    "border-border/50 bg-transparent text-muted-foreground hover:border-foreground/20 hover:bg-foreground/[0.02] hover:text-foreground/70 dark:bg-input/30 dark:hover:bg-foreground/[0.02] dark:hover:text-foreground/70",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                  disabled={isSubmitting}
                  onClick={handleAttachClick}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="size-4" />
                </motion.button>
              </PromptInputAction>
              <SelectModel
                onSelectModelAction={onSelectModelAction}
                selectedModel={selectedModel}
              />
              {isReasoningModel && (
                <SelectReasoningEffort
                  isUserAuthenticated={isUserAuthenticated}
                  onSelectReasoningEffortAction={onSelectReasoningEffortAction}
                  reasoningEffort={reasoningEffort}
                />
              )}
            </div>
            <PromptInputAction tooltip={tooltipText}>
              <button
                aria-label={isStreaming ? "Stop" : "Send message"}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition-all",
                  sendButtonStyles
                )}
                disabled={!(hasContent || isStreaming)}
                onClick={handleMainClick}
                type="button"
              >
                <AnimatePresence initial={false} mode="wait">
                  {isStreaming ? (
                    <motion.div
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      initial={{ scale: 0.8, opacity: 0 }}
                      key="stop"
                      transition={{ duration: 0.15 }}
                    >
                      <Square className="size-3.5 fill-current" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      initial={{ scale: 0.8, opacity: 0 }}
                      key="send"
                      transition={{ duration: 0.15 }}
                      whileHover={{
                        y: -2,
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 10,
                        },
                      }}
                    >
                      <CornerRightUp className="size-4" strokeWidth={2.5} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  );
}
