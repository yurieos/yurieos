"use client";

import { PushPinSimpleIcon } from "@phosphor-icons/react";
import { memo } from "react";
import type { LocalChat } from "@/lib/local-storage";
import { ChatItem } from "./chat-item";

// Group labels for display
const GROUP_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  lastWeek: "Last 7 Days",
  lastMonth: "Last 30 Days",
  older: "Older",
};

type ChatListProps = {
  pinnedChats: LocalChat[];
  groupedChats: Record<string, LocalChat[]>;
  orderedGroupKeys: string[];
  handleSaveEdit: (id: string, title: string) => void;
  handleConfirmDelete: (id: string) => void;
  handleTogglePin: (id: string) => void;
  hasChatsInGroup: (groupKey: string) => boolean;
  activeChatId?: string | null;
  onChatClick?: () => void;
};

export const ChatList = memo(function ChatListComponent({
  pinnedChats,
  groupedChats,
  orderedGroupKeys,
  handleSaveEdit,
  handleConfirmDelete,
  handleTogglePin,
  hasChatsInGroup,
  activeChatId,
  onChatClick,
}: ChatListProps) {
  const _hasAnyUnpinnedChats = orderedGroupKeys.some(
    (groupKey) => (groupedChats[groupKey]?.length ?? 0) > 0
  );

  return (
    <div className="flex flex-col pt-2 pb-8">
      {/* Pinned Chats Section */}
      {pinnedChats.length > 0 && (
        <div className="relative flex w-full min-w-0 flex-col">
          <h3 className="flex h-8 shrink-0 select-none items-center rounded-md px-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <PushPinSimpleIcon className="mr-1 h-3 w-3" />
            Pinned
          </h3>
          <ul className="flex w-full min-w-0 flex-col gap-1 text-sm">
            {pinnedChats.map((chat) => (
              <ChatItem
                handleConfirmDelete={handleConfirmDelete}
                handleSaveEdit={handleSaveEdit}
                handleTogglePin={handleTogglePin}
                id={chat.id}
                isActive={chat.id === activeChatId}
                isPinned={true}
                key={chat.id}
                onChatClick={onChatClick}
                title={chat.title}
              />
            ))}
          </ul>
        </div>
      )}
      {orderedGroupKeys.map(
        (groupKey) =>
          hasChatsInGroup(groupKey) && (
            <div
              className="relative flex w-full min-w-0 flex-col"
              key={groupKey}
            >
              <h3 className="flex h-8 shrink-0 select-none items-center rounded-md px-1.5 pt-8 pb-4 font-medium text-muted-foreground text-xs uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {GROUP_LABELS[groupKey] || groupKey}
              </h3>
              <ul className="flex w-full min-w-0 flex-col gap-1 text-sm">
                {groupedChats[groupKey]?.map((chat) => (
                  <ChatItem
                    handleConfirmDelete={handleConfirmDelete}
                    handleSaveEdit={handleSaveEdit}
                    handleTogglePin={handleTogglePin}
                    id={chat.id}
                    isActive={chat.id === activeChatId}
                    isPinned={false}
                    key={chat.id}
                    onChatClick={onChatClick}
                    title={chat.title}
                  />
                ))}
              </ul>
            </div>
          )
      )}
    </div>
  );
});
