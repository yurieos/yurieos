"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ThemeEditorState } from "@/lib/types/theme";
import { cn } from "@/lib/utils";

type Props = {
  themeState: ThemeEditorState;
};

function getPrimaryFontName(fontFamily: string | undefined): string | null {
  if (!fontFamily) return null;
  const first = fontFamily.split(",")[0]?.trim();
  if (!first) return null;
  return first.replace(/^["']|["']$/g, "");
}

// Normalize font keys for robust lookups: trim, strip quotes, collapse spaces, lowercase
const normalizeFontKey = (value: string): string =>
  value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

const registry: Record<string, () => Promise<{ fontVar: string }>> = {
  Outfit: () => import("./font-registry/outfit"),
  Inter: () => import("./font-registry/inter"),
  Montserrat: () => import("./font-registry/montserrat"),
  "Space Grotesk": () => import("./font-registry/space-grotesk"),
  "Open Sans": () => import("./font-registry/open-sans"),
  "DM Sans": () => import("./font-registry/dm-sans"),
  "Libre Baskerville": () => import("./font-registry/libre-baskerville"),
  "Architects Daughter": () => import("./font-registry/architects-daughter"),
  "Atkinson Hyperlegible": () => import("./font-registry/atkinson-hyperlegible"),
  "Atkinson Hyperlegible Mono": () => import("./font-registry/atkinson-hyperlegible-mono"),
  "Fira Code": () => import("./font-registry/fira-code"),
  "Fira Mono": () => import("./font-registry/fira-mono"),
  "JetBrains Mono": () => import("./font-registry/jetbrains-mono"),
  "IBM Plex Mono": () => import("./font-registry/ibm-plex-mono"),
};

// Create a normalized registry view for case/spacing-insensitive lookups
const normalizedRegistry: Record<string, () => Promise<{ fontVar: string }>> = Object.freeze(
  Object.fromEntries(Object.entries(registry).map(([k, v]) => [normalizeFontKey(k), v]))
);

export function FontActivator({ themeState }: Props) {
  const [vars, setVars] = useState<string[]>([]);
  const loadedRef = useRef<Set<string>>(new Set());
  const appliedRef = useRef<Set<string>>(new Set());

  const names = useMemo(() => {
    const s = new Set<string>();
    const exclude = new Set(["geist", "geist mono"]);
    const lightSans = getPrimaryFontName(themeState.styles.light["font-sans"]);
    const lightMono = getPrimaryFontName(themeState.styles.light["font-mono"]);
    const darkSans = getPrimaryFontName(themeState.styles.dark["font-sans"]);
    const darkMono = getPrimaryFontName(themeState.styles.dark["font-mono"]);
    [lightSans, lightMono, darkSans, darkMono].forEach((n) => {
      if (!n) return;
      const normalized = normalizeFontKey(n);
      if (!exclude.has(normalized)) s.add(normalized);
    });
    return Array.from(s);
  }, [themeState.styles]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const promises = names
        .filter((n) => !loadedRef.current.has(n))
        .map(async (n) => {
          const importer = normalizedRegistry[n];
          if (!importer) return null;
          try {
            const mod = await importer();
            if (cancelled) return null;
            loadedRef.current.add(n);
            return mod.fontVar;
          } catch {
            return null;
          }
        });
      const results = (await Promise.all(promises)).filter(
        (v): v is string => Boolean(v)
      );
      if (results.length && !cancelled) {
        setVars((prev) => Array.from(new Set([...prev, ...results])));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [names]);

  // Apply the variable classes to the root element so CSS variables are available globally
  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;

    const current = new Set(vars);
    const previouslyApplied = appliedRef.current;

    // Determine classes to add and remove
    const toAdd: string[] = [];
    const toRemove: string[] = [];

    current.forEach((cls) => {
      if (!previouslyApplied.has(cls)) toAdd.push(cls);
    });
    previouslyApplied.forEach((cls) => {
      if (!current.has(cls)) toRemove.push(cls);
    });

    if (toAdd.length > 0) root.classList.add(...toAdd);
    if (toRemove.length > 0) root.classList.remove(...toRemove);

    // Update tracking set
    appliedRef.current = current;

    return () => {
      // On unmount, remove all applied classes
      if (appliedRef.current.size > 0) {
        root.classList.remove(...Array.from(appliedRef.current));
        appliedRef.current.clear();
      }
    };
  }, [vars]);

  return null;
}
