"use client";

import { SidebarSimple } from "@phosphor-icons/react";
import { Plus, Search, Settings } from "lucide-react";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataSettingsDialog } from "@/app/components/settings/data-settings-dialog";
import { useChatSession } from "@/app/providers/chat-session-provider";
import { useSidebar } from "@/app/providers/sidebar-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  deleteChat as deleteLocalChat,
  getChats,
  type LocalChat,
  updateChat as updateLocalChat,
} from "@/lib/local-storage";
import { TRANSITION_LAYOUT } from "@/lib/motion";
import { ChatList } from "./chat-list";

function compareChatsByRecency(a: LocalChat, b: LocalChat): number {
  if (a.updatedAt !== b.updatedAt) {
    return b.updatedAt - a.updatedAt;
  }
  if (a.createdAt !== b.createdAt) {
    return b.createdAt - a.createdAt;
  }
  return a.id.localeCompare(b.id);
}

// Calendar-based time grouping for local chats (today/yesterday are local calendar days)
function groupChatsByTime(chats: LocalChat[]): Record<string, LocalChat[]> {
  const oneDay = 24 * 60 * 60 * 1000;
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();
  const startOfYesterdayMs = startOfTodayMs - oneDay;
  const startOfLastWeekMs = startOfTodayMs - 7 * oneDay;
  const startOfLastMonthMs = startOfTodayMs - 30 * oneDay;

  const groups: Record<string, LocalChat[]> = {
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: [],
  };

  for (const chat of chats) {
    const updatedAt = chat.updatedAt;
    if (updatedAt >= startOfTodayMs) {
      groups.today.push(chat);
    } else if (updatedAt >= startOfYesterdayMs) {
      groups.yesterday.push(chat);
    } else if (updatedAt >= startOfLastWeekMs) {
      groups.lastWeek.push(chat);
    } else if (updatedAt >= startOfLastMonthMs) {
      groups.lastMonth.push(chat);
    } else {
      groups.older.push(chat);
    }
  }

  return groups;
}

const ORDERED_GROUP_KEYS = [
  "today",
  "yesterday",
  "lastWeek",
  "lastMonth",
  "older",
];

type SidebarPanelProps = {
  isOpen: boolean;
  isLoading: boolean;
  chats: LocalChat[];
  activeChatId: string | null;
  groupedChats: Record<string, LocalChat[]>;
  pinnedChats: LocalChat[];
  hasChatsInGroup: (group: string) => boolean;
  handleConfirmDelete: (id: string) => void;
  handleSaveEdit: (id: string, newTitle: string) => void;
  handleTogglePin: (id: string) => void;
  handleConditionalNewChatClick: () => void;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchQuery: string;
  onChatClick?: () => void;
  showHeader?: boolean;
  isFloating?: boolean;
};

function getSidebarWidth(
  isFloating: boolean,
  isOpen: boolean
): string | number {
  if (isFloating) {
    return "100%";
  }
  return isOpen ? 256 : 0;
}

function getSidebarOpacity(isFloating: boolean, isOpen: boolean): number {
  if (isFloating) {
    return 1;
  }
  return isOpen ? 1 : 0;
}

function getTopPadding(isFloating: boolean, showHeader: boolean): string {
  if (isFloating) {
    return "pt-4";
  }
  if (showHeader) {
    return "pt-0";
  }
  return "pt-app-header";
}

function SidebarPanel({
  isOpen,
  isLoading,
  chats,
  activeChatId,
  groupedChats,
  pinnedChats,
  hasChatsInGroup,
  handleConfirmDelete,
  handleSaveEdit,
  handleTogglePin,
  handleConditionalNewChatClick,
  handleSearchChange,
  searchQuery,
  onChatClick,
  showHeader = false,
  isFloating = false,
}: SidebarPanelProps) {
  const sidebarWidth = getSidebarWidth(isFloating, isOpen);
  const sidebarOpacity = getSidebarOpacity(isFloating, isOpen);
  const topPaddingClass = getTopPadding(isFloating, showHeader);

  return (
    <motion.aside
      animate={{
        width: sidebarWidth,
      }}
      className={`flex flex-col overflow-hidden ${
        isFloating
          ? "h-full bg-transparent"
          : "h-dvh bg-background md:bg-sidebar md:dark:bg-transparent"
      }`}
      initial={{
        width: sidebarWidth,
      }}
      transition={TRANSITION_LAYOUT}
    >
      {/* Mobile Header with toggle button - only show for non-floating */}
      {showHeader && !isFloating && (
        <motion.div
          animate={{
            opacity: isOpen ? 1 : 0,
          }}
          className="flex h-app-header shrink-0 items-center px-3"
          initial={{
            opacity: isOpen ? 1 : 0,
          }}
          transition={TRANSITION_LAYOUT}
        >
          {/* Removed duplicate SidebarSimple button here */}
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        animate={{
          opacity: sidebarOpacity,
        }}
        className={`flex shrink-0 items-center gap-2 px-4 pb-0 ${topPaddingClass}`}
        initial={{
          opacity: sidebarOpacity,
        }}
        transition={TRANSITION_LAYOUT}
      >
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 w-full rounded-full border-sidebar-border bg-sidebar-accent/10 pl-8 text-sm focus-visible:border-neutral-500/50 focus-visible:ring-neutral-500/25 dark:bg-sidebar-accent/10"
            onChange={handleSearchChange}
            placeholder="Search chats..."
            type="search"
            value={searchQuery}
          />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={handleConditionalNewChatClick}
              size="icon"
              variant="ghost"
            >
              <Plus className="size-6" />
              <span className="sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>

        <DataSettingsDialog>
          <Button
            className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            size="icon"
            variant="ghost"
          >
            <Settings className="size-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </DataSettingsDialog>
      </motion.div>

      {/* Scrollable Chat List */}
      <motion.div
        animate={{
          opacity: sidebarOpacity,
        }}
        className={`flex flex-grow flex-col overflow-y-auto px-4 pt-1 ${
          isFloating
            ? "pb-4"
            : "pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        }`}
        initial={{
          opacity: sidebarOpacity,
        }}
        transition={TRANSITION_LAYOUT}
      >
        {isLoading && chats.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div className="h-8 animate-pulse rounded bg-muted/50" key={i} />
            ))}
          </div>
        ) : (
          <ChatList
            activeChatId={activeChatId}
            groupedChats={groupedChats}
            handleConfirmDelete={handleConfirmDelete}
            handleSaveEdit={handleSaveEdit}
            handleTogglePin={handleTogglePin}
            hasChatsInGroup={hasChatsInGroup}
            onChatClick={onChatClick}
            orderedGroupKeys={ORDERED_GROUP_KEYS}
            pinnedChats={pinnedChats}
          />
        )}
      </motion.div>
    </motion.aside>
  );
}

const ChatSidebar = memo(function SidebarComponent() {
  const { isSidebarOpen: isOpen, toggleSidebar, closeSidebar } = useSidebar();
  const [chats, setChats] = useState<LocalChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setIsDeleting: setChatIsDeleting, chatId: activeChatId } =
    useChatSession();
  const activeChatIdRef = useRef<string | null>(activeChatId);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState("");

  // Load chats from localStorage
  useEffect(() => {
    const loadChats = () => {
      const localChats = getChats();
      setChats(localChats);
      setIsLoading(false);
    };

    loadChats();

    // Re-load chats when localStorage changes (from other tabs or components)
    const handleStorageChange = () => {
      loadChats();
    };

    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener("chatsUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("chatsUpdated", handleStorageChange);
    };
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleNewChatClick = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleConditionalNewChatClick = useCallback(() => {
    if (pathname !== "/") {
      router.push("/");
    }
  }, [pathname, router]);

  // Handlers for chat list
  const handleSaveEdit = useCallback((id: string, newTitle: string) => {
    updateLocalChat(id, { title: newTitle });
  }, []);

  const handleConfirmDelete = useCallback(
    (id: string) => {
      const isCurrentChat = activeChatIdRef.current === id;
      if (isCurrentChat) {
        setChatIsDeleting(true);
      }

      try {
        deleteLocalChat(id);

        if (isCurrentChat) {
          router.push("/");
        }
      } catch (err) {
        if (isCurrentChat) {
          setChatIsDeleting(false);
        }
        throw err;
      }
    },
    [router, setChatIsDeleting]
  );

  const handleTogglePin = useCallback(
    (id: string) => {
      const chat = chats.find((c) => c.id === id);
      if (chat) {
        updateLocalChat(id, { isPinned: !chat.isPinned });
      }
    },
    [chats]
  );

  // Memoize filtered chats
  const filteredChats = useMemo(() => {
    if (!chats?.length) {
      return [];
    }
    const trimmedQuery = searchQuery.trim();
    const baseChats = trimmedQuery
      ? chats.filter((chat) =>
          (chat.title || "").toLowerCase().includes(trimmedQuery.toLowerCase())
        )
      : chats;

    return [...baseChats].sort(compareChatsByRecency);
  }, [chats, searchQuery]);

  // Memoize pinned and unpinned chats
  const { pinnedChats, unpinnedChats } = useMemo(() => {
    if (!filteredChats.length) {
      return { pinnedChats: [], unpinnedChats: [] };
    }

    const pinned: LocalChat[] = [];
    const unpinned: LocalChat[] = [];

    for (const chat of filteredChats) {
      if (chat.isPinned) {
        pinned.push(chat);
      } else {
        unpinned.push(chat);
      }
    }

    return { pinnedChats: pinned, unpinnedChats: unpinned };
  }, [filteredChats]);

  // Memoize grouped chats
  const groupedChats = useMemo(
    () => groupChatsByTime(unpinnedChats),
    [unpinnedChats]
  );

  const hasChatsInGroup = useCallback(
    (group: string) => (groupedChats[group]?.length ?? 0) > 0,
    [groupedChats]
  );

  return (
    <>
      <div className="hidden md:block">
        {/* Fixed collapse button */}
        <div className="fixed top-0 left-[calc(0.75rem-2px+env(safe-area-inset-left,0px))] z-[60] flex h-app-header items-center">
          <button
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={
              "group flex items-center justify-center rounded-full p-2 outline-none ring-offset-background transition-all duration-300 hover:bg-accent focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            }
            onClick={toggleSidebar}
            tabIndex={0}
            type="button"
          >
            <SidebarSimple
              className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
              weight="bold"
            />
          </button>
          {pathname !== "/" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  animate={{
                    x: isOpen ? -8 : 0,
                    scale: isOpen ? 0.5 : 1,
                    opacity: isOpen ? 0 : 1,
                  }}
                  aria-label="New chat"
                  className="pointer-events-auto ml-1 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground outline-none ring-offset-background hover:bg-muted hover:text-foreground focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  initial={{
                    x: isOpen ? -8 : 0,
                    scale: isOpen ? 0.5 : 1,
                    opacity: isOpen ? 0 : 1,
                  }}
                  onClick={handleNewChatClick}
                  style={{ pointerEvents: isOpen ? "none" : "auto" }}
                  tabIndex={isOpen ? -1 : 0}
                  transition={{
                    ...TRANSITION_LAYOUT,
                    delay: isOpen ? 0 : 0.1,
                  }}
                  type="button"
                >
                  <Plus className="size-6" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* The sidebar panel */}
        <SidebarPanel
          activeChatId={activeChatId}
          chats={chats}
          groupedChats={groupedChats}
          handleConditionalNewChatClick={handleConditionalNewChatClick}
          handleConfirmDelete={handleConfirmDelete}
          handleSaveEdit={handleSaveEdit}
          handleSearchChange={handleSearchChange}
          handleTogglePin={handleTogglePin}
          hasChatsInGroup={hasChatsInGroup}
          isLoading={isLoading}
          isOpen={isOpen}
          pinnedChats={pinnedChats}
          searchQuery={searchQuery}
        />
      </div>

      {/* Mobile drawer sidebar with backdrop - Floating style */}
      <div className="md:hidden">
        {/* Backdrop overlay */}
        <motion.div
          animate={{
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
          }}
          aria-hidden="true"
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          initial={{
            opacity: 0,
            pointerEvents: "none",
          }}
          onClick={toggleSidebar}
          transition={TRANSITION_LAYOUT}
        />
        {/* Floating Sidebar panel */}
        <motion.div
          animate={{
            x: isOpen ? 0 : -280,
            opacity: isOpen ? 1 : 0,
          }}
          className="fixed top-2 bottom-2 left-2 z-[70] w-[calc(100vw-5rem)] max-w-72 overflow-hidden rounded-2xl border border-sidebar-border/50 bg-background shadow-2xl"
          initial={{
            x: -280,
            opacity: 0,
          }}
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
          }}
          transition={TRANSITION_LAYOUT}
        >
          <SidebarPanel
            activeChatId={activeChatId}
            chats={chats}
            groupedChats={groupedChats}
            handleConditionalNewChatClick={handleConditionalNewChatClick}
            handleConfirmDelete={handleConfirmDelete}
            handleSaveEdit={handleSaveEdit}
            handleSearchChange={handleSearchChange}
            handleTogglePin={handleTogglePin}
            hasChatsInGroup={hasChatsInGroup}
            isFloating={true}
            isLoading={isLoading}
            isOpen={isOpen}
            onChatClick={closeSidebar}
            pinnedChats={pinnedChats}
            searchQuery={searchQuery}
            showHeader={true}
          />
        </motion.div>
      </div>
    </>
  );
});

export default ChatSidebar;
