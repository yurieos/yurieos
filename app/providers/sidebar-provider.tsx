"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const SIDEBAR_STORAGE_KEY = "sidebarOpen";

type SidebarContextType = {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Keep the server render and the client's first render in sync to avoid hydration mismatches.
  // Persisted state is applied after mount.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (savedState === null) {
        return;
      }
      setIsSidebarOpen(savedState === "true");
    } catch {
      // Silently handle localStorage errors (private mode, blocked, quota exceeded, etc.)
    }
  }, []);

  const persistPreference = useCallback((open: boolean) => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
    } catch {
      // Silently handle localStorage errors (private mode, blocked, quota exceeded, etc.)
    }
  }, []);

  const setSidebarOpen = useCallback(
    (open: boolean) => {
      setIsSidebarOpen(open);
      persistPreference(open);
    },
    [persistPreference]
  );

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, [setSidebarOpen]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      persistPreference(newState);
      return newState;
    });
  }, [persistPreference]);

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        setSidebarOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
