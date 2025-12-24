"use client";

import { CaretRight, Globe } from "@phosphor-icons/react";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { memo, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// Regex patterns defined at top level for performance
const WWW_PREFIX_REGEX = /^www\./;
const PROTOCOL_REGEX = /^https?:\/\//;
const TRAILING_SLASH_REGEX = /\/$/;

type SimpleSource = {
  url: string;
  title?: string;
};

type SourcesListProps = {
  sources: SimpleSource[];
  className?: string;
};

const getFavicon = (url: string) => {
  const domain = new URL(url).hostname;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
};

const addUTM = (url: string) => {
  const u = new URL(url);
  u.searchParams.set("utm_source", "yurie.ai");
  u.searchParams.set("utm_medium", "web-search");
  return u.toString();
};

const TRANSITION: Transition = {
  type: "spring",
  duration: 0.2,
  bounce: 0,
};

export const SourcesList = memo<SourcesListProps>(
  ({ sources, className }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const formatUrl = useCallback((url: string) => {
      try {
        const domain = new URL(url).hostname;
        return domain.replace(WWW_PREFIX_REGEX, "");
      } catch {
        return url
          .replace(PROTOCOL_REGEX, "")
          .replace(TRAILING_SLASH_REGEX, "")
          .replace(WWW_PREFIX_REGEX, "");
      }
    }, []);

    const handleToggleExpanded = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    // Memoize favicon generation
    const sourcesWithFavicons = useMemo(
      () =>
        sources.map((source) => ({
          ...source,
          faviconUrl: getFavicon(source.url),
          formattedUrl: formatUrl(source.url),
          utmUrl: addUTM(source.url),
        })),
      [sources, formatUrl]
    );

    // Memoize preview favicons for the collapsed state
    const previewFavicons = useMemo(
      () => sourcesWithFavicons.slice(0, 4),
      [sourcesWithFavicons]
    );

    const remainingCount = sources.length - 4;

    return (
      <div className={cn("my-1", className)}>
        <button
          className="flex items-center gap-2 py-1 transition-colors"
          onClick={handleToggleExpanded}
          type="button"
        >
          <Globe className="size-4 text-muted-foreground" />
          <span className="font-medium text-muted-foreground text-sm">
            {sources.length} sources
          </span>
          <div className="flex items-center -space-x-1">
            {previewFavicons.map((source, index) => (
              /* biome-ignore lint/performance/noImgElement: Favicons should use native img for better caching */
              <img
                alt={`${source.formattedUrl}`}
                className="size-4 rounded-full border-2 border-background bg-muted"
                decoding="async"
                height={16}
                key={source.url}
                loading="lazy"
                referrerPolicy="no-referrer"
                src={source.faviconUrl}
                style={{ zIndex: previewFavicons.length - index }}
                width={16}
              />
            ))}
            {remainingCount > 0 && (
              <span className="pl-1.5 text-muted-foreground text-xs">
                +{remainingCount}
              </span>
            )}
          </div>
          <CaretRight
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              isExpanded && "rotate-90"
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={TRANSITION}
            >
              <div className="flex flex-col py-1 pl-6">
                {sourcesWithFavicons.map((source) => {
                  const title = source.title || source.formattedUrl;

                  return (
                    <a
                      className="flex items-start gap-2 py-1 transition-colors hover:text-foreground"
                      href={source.utmUrl}
                      key={`${source.url}-${title}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {/* biome-ignore lint/performance/noImgElement: Favicons should use native img for better caching */}
                      <img
                        alt={`${source.formattedUrl}`}
                        className="mt-0.5 size-4 shrink-0 rounded"
                        decoding="async"
                        height={16}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        src={source.faviconUrl}
                        width={16}
                      />
                      <span className="min-w-0 flex-1 break-words text-muted-foreground text-sm">
                        {title}
                      </span>
                      <span className="shrink-0 text-muted-foreground text-xs">
                        {source.formattedUrl}
                      </span>
                    </a>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to avoid deep comparison on sources array
    if (prevProps.className !== nextProps.className) {
      return false;
    }
    if (prevProps.sources.length !== nextProps.sources.length) {
      return false;
    }

    return prevProps.sources.every((source, index) => {
      const nextSource = nextProps.sources[index];
      return (
        source.url === nextSource?.url && source.title === nextSource?.title
      );
    });
  }
);
