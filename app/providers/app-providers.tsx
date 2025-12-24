"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ChatSessionProvider } from "./chat-session-provider";
import { UserProvider } from "./user-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <UserProvider>
        <ChatSessionProvider>
          <Toaster position="top-center" />
          {children}
        </ChatSessionProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
