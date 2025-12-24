"use client";

import { Check, PenLine, Pin, PinOff, Trash, X } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ChatItemProps = {
  id: string;
  title: string | undefined;
  handleSaveEdit: (id: string, title: string) => void;
  handleConfirmDelete: (id: string) => void;
  handleTogglePin: (id: string) => void;
  isPinned: boolean;
  isActive?: boolean;
  onChatClick?: () => void;
};

function ChatItemComponent({
  id,
  title,
  handleSaveEdit,
  handleConfirmDelete,
  handleTogglePin,
  isPinned,
  isActive,
  onChatClick,
}: ChatItemProps): React.ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title || "");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setEditedTitle(title || "");
    }
  }, [isEditing, title]);

  const onSave = () => {
    handleSaveEdit(id, editedTitle.trim());
    setIsEditing(false);
  };

  const onDelete = () => {
    handleConfirmDelete(id);
    setIsDeleting(false);
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="group/menu-item relative flex h-9 items-center rounded-full pr-1.5 pl-2">
          <form
            className="flex w-full items-center justify-between"
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <Input
              aria-label="Chat title"
              autoFocus
              className="h-7 flex-1 rounded-full border border-sidebar-border/50 bg-transparent px-3 text-sidebar-foreground text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-sidebar-border focus-visible:ring-0 dark:bg-transparent"
              onChange={(e) => setEditedTitle(e.target.value)}
              value={editedTitle}
            />
            <div className="ml-1 flex gap-1">
              <Button
                aria-label="Save title"
                className="size-7 rounded-full p-1.5 text-sidebar-foreground/70 transition-all duration-150 hover:scale-105 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                size="icon"
                type="submit"
                variant="ghost"
              >
                <Check className="size-3.5" />
              </Button>
              <Button
                aria-label="Cancel edit"
                className="size-7 rounded-full p-1.5 text-sidebar-foreground/70 transition-all duration-150 hover:scale-105 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(false);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </form>
        </div>
      );
    }

    if (isDeleting) {
      return (
        <div className="group/menu-item relative flex h-9 w-full items-center overflow-hidden rounded-full bg-sidebar-accent pr-1.5 pl-3 text-sidebar-accent-foreground text-sm">
          <div className="flex w-full items-center justify-between">
            <span className="font-medium text-destructive text-sm">
              Delete chat?
            </span>
            <div className="flex items-center gap-1">
              <Button
                aria-label="Confirm delete"
                className="size-7 rounded-full p-1.5 text-sidebar-accent-foreground/70 transition-all duration-150 hover:scale-105 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Check className="size-3.5" />
              </Button>
              <Button
                aria-label="Cancel delete"
                className="size-7 rounded-full p-1.5 text-sidebar-accent-foreground/70 transition-all duration-150 hover:scale-105 hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground active:scale-95"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDeleting(false);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <Link
          className={cn(
            "relative flex h-9 w-full items-center overflow-hidden rounded-full px-2 py-1 text-sm outline-none transition-colors duration-200 ease-in-out",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:text-sidebar-accent-foreground group-focus-within/menu-item:bg-sidebar-accent group-focus-within/menu-item:text-sidebar-accent-foreground",
            "focus-visible:ring-2 focus-visible:ring-primary",
            isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          href={`/c/${id}`}
          onClick={(e) => {
            if (isActive) {
              e.preventDefault();
            }
            onChatClick?.();
          }}
          prefetch
          replace
          scroll={false}
        >
          <div className="relative flex w-full items-center">
            <div className="relative w-full">
              <span className="pointer-events-none block h-full w-full cursor-pointer overflow-hidden truncate rounded bg-transparent px-1 py-1 text-sm outline-none">
                {title || "Untitled chat"}
              </span>
            </div>
          </div>
        </Link>

        <div
          className={cn(
            "pointer-events-none absolute top-0 right-0 bottom-0 z-10 flex translate-x-1 items-center justify-end gap-1 rounded-r-full bg-gradient-to-l from-50% from-sidebar-accent to-transparent py-0.5 pr-1.5 pl-12 opacity-0 transition-all duration-300 ease-out",
            "group-hover/menu-item:pointer-events-auto group-hover/menu-item:translate-x-0 group-hover/menu-item:opacity-100",
            "group-focus-within/menu-item:pointer-events-auto group-focus-within/menu-item:translate-x-0 group-focus-within/menu-item:opacity-100",
            isActive && "pointer-events-auto translate-x-0 opacity-100"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={isPinned ? "Unpin chat" : "Pin chat"}
                className="size-7 rounded-full p-1.5 text-sidebar-foreground/70 shadow-none transition-all duration-150 hover:scale-105 hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePin(id);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                {isPinned ? (
                  <PinOff className="size-3.5" />
                ) : (
                  <Pin className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="z-[9999]" side="bottom">
              {isPinned ? "Unpin" : "Pin"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Edit chat title"
                className="size-7 rounded-full p-1.5 text-sidebar-foreground/70 shadow-none transition-all duration-150 hover:scale-105 hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleting(false);
                  setIsEditing(true);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <PenLine className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="z-[9999]" side="bottom">
              Edit
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Delete chat"
                className="size-7 rounded-full p-1.5 text-sidebar-foreground/70 shadow-none transition-all duration-150 hover:scale-105 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(false);
                  setIsDeleting(true);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="z-[9999]" side="bottom">
              Delete
            </TooltipContent>
          </Tooltip>
        </div>
      </>
    );
  };

  return (
    <li className="group/menu-item relative" key={id}>
      {renderContent()}
    </li>
  );
}

// Export with custom memo comparison
export const ChatItem = React.memo(
  ChatItemComponent,
  (prevProps, nextProps) =>
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.isActive === nextProps.isActive
);
