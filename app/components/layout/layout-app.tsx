"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useSidebar } from "@/app/providers/sidebar-provider";
import ChatSidebar from "./chat-sidebar";
import { Header } from "./header";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  const { toggleSidebar, isSidebarOpen } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const isAuth = pathname?.startsWith("/auth");

  // Helper functions to reduce complexity
  const isInputElementFocused = useCallback((target: EventTarget | null) => {
    const element = target as HTMLElement;
    const tag = element?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || element?.isContentEditable;
  }, []);

  const handleGlobalSearch = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new Event("toggleFloatingSearch"));
  }, []);

  const handleNewChat = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();
      if (pathname !== "/") {
        router.push("/");
      }
    },
    [pathname, router]
  );

  const handleToggleSidebar = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();
      toggleSidebar();
    },
    [toggleSidebar]
  );

  // Keyboard shortcuts: Cmd+Shift+O for new chat, Cmd+B to toggle sidebar, Cmd+K for search
  const handler = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isMeta = e.metaKey || e.ctrlKey;

      // Handle Cmd+K globally (even when inputs are focused)
      if (isMeta && key === "k") {
        handleGlobalSearch(e);
        return;
      }

      // For other shortcuts, skip if focused on input elements
      if (isInputElementFocused(e.target)) {
        return;
      }

      if (!isMeta) {
        return;
      }

      if (e.shiftKey && key === "o") {
        handleNewChat(e);
        return;
      }

      if (!e.shiftKey && key === "b") {
        handleToggleSidebar(e);
      }
    },
    [
      handleGlobalSearch,
      isInputElementFocused,
      handleNewChat,
      handleToggleSidebar,
    ]
  );
  useEffect(() => {
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [handler]);

  // Auth pages use their own layout; do not render ChatSidebar/Header
  if (isAuth) {
    return <>{children}</>;
  }

  return (
    // Main flex container - sidebar background extends to edges
    <div className="flex h-full overflow-hidden bg-sidebar dark:bg-input/30">
      {/* Sidebar */}
      <ChatSidebar />

      {/* Main Content Area - Inset style with rounded corners and shadow */}
      <div
        className={`relative flex flex-1 flex-col overflow-hidden bg-background transition-all duration-300 ease-out md:my-2 md:mr-2 md:rounded-xl md:shadow-lg ${
          isSidebarOpen ? "md:ml-0" : "md:ml-2"
        }`}
      >
        {/* Header */}
        <Header />
        {/* Main content - scrolling handled by child components */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
