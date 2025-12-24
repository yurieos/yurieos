"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getSettings,
  type LocalSettings,
  updateSettings as updateLocalSettings,
} from "@/lib/local-storage";

// Simplified user type for local-only mode
type UserProfile = {
  _id: string;
  name?: string;
  preferredName?: string;
  email?: string;
  image?: string;
  occupation?: string;
  traits?: string;
  about?: string;
  customInstructions?: string;
  isAnonymous: boolean;
  preferredModel?: string;
  disabledModels?: string[];
  favoriteModels?: string[];
};

type UserContextType = {
  user: UserProfile | null;
  isLoading: boolean;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => void;
  // User capabilities - always enabled in local mode
  hasPremium: boolean;
  products: { premium?: { id: string } } | undefined;
  // API Keys - not applicable in local mode
  apiKeys: never[];
  hasApiKey: Map<string, boolean>;
  isApiKeysLoading: boolean;
  // Connectors - not applicable in local mode
  connectors: never[];
  isConnectorsLoading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// Create a local user from settings
function createLocalUser(settings: LocalSettings): UserProfile {
  return {
    _id: "local-user",
    name: settings.name,
    preferredName: settings.name,
    email: undefined,
    image: undefined,
    occupation: settings.occupation,
    traits: settings.traits,
    about: undefined,
    customInstructions: settings.customInstructions,
    isAnonymous: false,
    preferredModel: settings.preferredModel,
    disabledModels: settings.disabledModels,
    favoriteModels: settings.favoriteModels,
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<LocalSettings>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadedSettings = getSettings();
    setSettings(loadedSettings);
    setIsLoading(false);
  }, []);

  const user = useMemo(() => createLocalUser(settings), [settings]);

  // No-op auth functions (local mode doesn't have auth)
  const signInGoogle = useCallback(async () => {
    // No-op in local mode
  }, []);

  const signOut = useCallback(async () => {
    // No-op in local mode
  }, []);

  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    const settingsUpdates: Partial<LocalSettings> = {};

    if (updates.name !== undefined) {
      settingsUpdates.name = updates.name;
    }
    if (updates.preferredName !== undefined) {
      settingsUpdates.name = updates.preferredName;
    }
    if (updates.occupation !== undefined) {
      settingsUpdates.occupation = updates.occupation;
    }
    if (updates.traits !== undefined) {
      settingsUpdates.traits = updates.traits;
    }
    if (updates.customInstructions !== undefined) {
      settingsUpdates.customInstructions = updates.customInstructions;
    }
    if (updates.preferredModel !== undefined) {
      settingsUpdates.preferredModel = updates.preferredModel;
    }
    if (updates.disabledModels !== undefined) {
      settingsUpdates.disabledModels = updates.disabledModels;
    }
    if (updates.favoriteModels !== undefined) {
      settingsUpdates.favoriteModels = updates.favoriteModels;
    }

    const newSettings = updateLocalSettings(settingsUpdates);
    setSettings(newSettings);
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      signInGoogle,
      signOut,
      updateUser,
      // In local mode, everyone has "premium" access
      hasPremium: true,
      products: undefined,
      // No API keys management in local mode
      apiKeys: [] as never[],
      hasApiKey: new Map<string, boolean>(),
      isApiKeysLoading: false,
      // No connectors in local mode
      connectors: [] as never[],
      isConnectorsLoading: false,
    }),
    [user, isLoading, signInGoogle, signOut, updateUser]
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
