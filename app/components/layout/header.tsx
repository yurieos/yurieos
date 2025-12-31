"use client";

import { SidebarSimple } from "@phosphor-icons/react";
import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useBreakpoint } from "@/app/hooks/use-breakpoint";
import { useSidebar } from "@/app/providers/sidebar-provider";
import { useUser } from "@/app/providers/user-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header() {
  useUser();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useBreakpoint(768);
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-50 h-auto shrink-0 bg-background/80 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md transition-all md:bg-transparent md:pt-0">
      <div className="relative mx-auto flex h-app-header items-center justify-between pr-[calc(1rem+env(safe-area-inset-right,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] sm:pr-[calc(1.5rem+env(safe-area-inset-right,0px))] sm:pl-[calc(1.5rem+env(safe-area-inset-left,0px))] md:rounded-t-xl lg:pr-[calc(2rem+env(safe-area-inset-right,0px))] lg:pl-[calc(2rem+env(safe-area-inset-left,0px))]">
        {/* Logo on mobile */}
        <div className="-ml-1.5 flex items-center sm:-ml-3 md:hidden">
          <button
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="group flex items-center justify-center rounded-full p-2 outline-none ring-offset-background transition-all duration-300 hover:bg-accent focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={toggleSidebar}
            type="button"
          >
            <SidebarSimple
              className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
              weight="bold"
            />
          </button>
        </div>

        {/* Hidden placeholder to prevent layout shift on desktop */}
        <div className="hidden w-24 md:block" />

        <div className="flex items-center gap-4">
          {/* Mobile button for new chat */}
          {isMobile && pathname !== "/" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label="New Chat"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => router.push("/")}
                  type="button"
                >
                  <Plus size={24} />
                </button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
}
