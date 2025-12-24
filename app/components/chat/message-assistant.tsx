"use client";

import type { UIMessage as MessageType } from "@ai-sdk/react";
import type {
  FileUIPart,
  ReasoningUIPart,
  SourceUrlUIPart,
  ToolUIPart,
} from "ai";
import {
  Check,
  ChevronRight,
  Copy,
  FileText,
  Globe,
  RotateCw,
  Search,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { memo, useMemo } from "react";
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTrigger,
} from "@/components/motion-primitives/morphing-dialog";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SourcesList } from "./sources-list";

type SearchToolInput = {
  query: string;
  maxResults?: number;
  scrapeContent?: boolean;
};

type SearchToolResultItem = {
  url: string;
  title: string;
  description: string;
  content?: string;
  markdown: string;
};

type SearchToolResult = {
  results: SearchToolResultItem[];
};

type ToolPartState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

// Error part type for rendering
type ErrorUIPart = {
  type: "error";
  error: {
    code: string;
    message: string;
    rawError?: string;
  };
};

type MessageAssistantProps = {
  isLast?: boolean;
  hasScrollAnchor?: boolean;
  copied?: boolean;
  copyToClipboard?: () => void;
  onReload?: () => void;
  onBranch?: () => void;
  model?: string;
  parts?: MessageType["parts"];
  status?: "streaming" | "ready" | "submitted" | "error";
  id: string;
  metadata?: {
    modelId?: string;
    modelName?: string;
    includeSearch?: boolean;
    reasoningEffort?: string;
  };
  readOnly?: boolean;
};

const Markdown = dynamic(
  () => import("@/components/prompt-kit/markdown").then((mod) => mod.Markdown),
  { ssr: false }
);

const MARKDOWN_HEADING_REGEX = /^#{1,6}\s+(.+)$/;
const COLON_HEADING_REGEX = /^([A-Za-z][A-Za-z0-9\s-]{2,40}):\s+.+$/;
const DOUBLE_NEWLINE_REGEX = /\n{2,}/;
const NEWLINE_REGEX = /\r?\n/;
const LIST_MARKER_REGEX = /^(?:[-*+]\s+|\d+\.\s+)/;
const TITLE_CANDIDATE_MAX_CHARS = 80;
const TITLE_CANDIDATE_MAX_WORDS = 12;
const TITLE_CANDIDATE_DISALLOWED_STARTS = ["```", "`", "{", "[", "("] as const;
const WWW_PREFIX_REGEX = /^www\./;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSearchToolInput(value: unknown): value is SearchToolInput {
  return isRecord(value) && typeof value.query === "string";
}

function isSearchToolResult(value: unknown): value is SearchToolResult {
  if (!isRecord(value)) {
    return false;
  }

  const { results } = value;
  if (!Array.isArray(results)) {
    return false;
  }

  return results.every(
    (item) => isRecord(item) && typeof item.url === "string"
  );
}

function getToolState(part: ToolUIPart): ToolPartState | null {
  const maybeState = "state" in part ? part.state : null;
  if (
    maybeState === "input-streaming" ||
    maybeState === "input-available" ||
    maybeState === "output-available" ||
    maybeState === "output-error"
  ) {
    return maybeState;
  }
  return null;
}

function getToolName(part: ToolUIPart): string | null {
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length);
  }

  if ("toolName" in part && typeof part.toolName === "string") {
    return part.toolName;
  }

  return null;
}

function getToolCallId(part: ToolUIPart): string | null {
  if ("toolCallId" in part && typeof part.toolCallId === "string") {
    return part.toolCallId;
  }
  return null;
}

function getToolInput(part: ToolUIPart): unknown {
  return "input" in part ? part.input : null;
}

function getToolOutput(part: ToolUIPart): unknown {
  return "output" in part ? part.output : null;
}

function getToolErrorText(part: ToolUIPart): string | null {
  if ("errorText" in part && typeof part.errorText === "string") {
    return part.errorText;
  }
  return null;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(WWW_PREFIX_REGEX, "");
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  const domain = getHostname(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function addUtm(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "yurie.ai");
    u.searchParams.set("utm_medium", "web-search");
    return u.toString();
  } catch {
    return url;
  }
}

type ParsedReasoningStep = {
  title: string;
  items: string[];
};

function normalizeReasoningTitle(title: string): string {
  let t = title.trim();

  if (t.startsWith("**") && t.endsWith("**") && t.length > 4) {
    t = t.slice(2, -2);
  }

  if (t.startsWith("__") && t.endsWith("__") && t.length > 4) {
    t = t.slice(2, -2);
  }

  if (t.startsWith("`") && t.endsWith("`") && t.length > 2) {
    t = t.slice(1, -1);
  }

  return t.trim();
}

function isImplicitTitleCandidate(line: string): boolean {
  const t = line.trim();
  if (!t) {
    return false;
  }

  if (t.length > TITLE_CANDIDATE_MAX_CHARS) {
    return false;
  }

  if (LIST_MARKER_REGEX.test(t)) {
    return false;
  }

  for (const disallowedStart of TITLE_CANDIDATE_DISALLOWED_STARTS) {
    if (t.startsWith(disallowedStart)) {
      return false;
    }
  }

  const lastChar = t.at(-1);
  if (lastChar === "." || lastChar === "!" || lastChar === "?") {
    return false;
  }

  const wordCount = t.split(" ").filter(Boolean).length;
  if (wordCount > TITLE_CANDIDATE_MAX_WORDS) {
    return false;
  }

  return true;
}

function getReasoningStepTitle(line: string): string | null {
  const markdownHeadingMatch = line.match(MARKDOWN_HEADING_REGEX);
  if (markdownHeadingMatch) {
    return markdownHeadingMatch[1]?.trim() || null;
  }

  const colonHeadingMatch = line.match(COLON_HEADING_REGEX);
  if (!colonHeadingMatch) {
    return null;
  }

  const prefix = colonHeadingMatch[1]?.toLowerCase() || "";
  const isLikelySection = [
    "research",
    "analysis",
    "solution",
    "plan",
    "approach",
    "implementation",
    "design",
    "solution",
  ].some((keyword) => prefix.includes(keyword));

  return isLikelySection ? line : null;
}

function splitReasoningBodyIntoItems(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) {
    return [];
  }

  const blocks = trimmed
    .split(DOUBLE_NEWLINE_REGEX)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length > 1) {
    return blocks;
  }

  const lines = trimmed
    .split(NEWLINE_REGEX)
    .map((l) => l.trim())
    .filter(Boolean);

  const looksLikeList = lines.some((l) => LIST_MARKER_REGEX.test(l));
  if (!looksLikeList && lines.length > 1) {
    return lines;
  }

  return [trimmed];
}

function parseReasoningIntoSteps(text: string): ParsedReasoningStep[] | null {
  const lines = text.split(NEWLINE_REGEX);

  let firstNonEmpty: string | null = null;
  let hasMoreNonEmptyAfterFirst = false;
  for (const rawLine of lines) {
    const t = rawLine.trim();
    if (!t) {
      continue;
    }

    if (!firstNonEmpty) {
      firstNonEmpty = t;
      continue;
    }

    hasMoreNonEmptyAfterFirst = true;
    break;
  }

  const implicitTitle =
    firstNonEmpty &&
    hasMoreNonEmptyAfterFirst &&
    !getReasoningStepTitle(firstNonEmpty) &&
    isImplicitTitleCandidate(firstNonEmpty)
      ? { match: firstNonEmpty, title: normalizeReasoningTitle(firstNonEmpty) }
      : null;

  const steps: Array<{ title: string; body: string }> = [];
  let currentTitle = "";
  let currentBody = "";

  const pushCurrent = () => {
    const title = currentTitle.trim();
    const body = currentBody.trim();
    if (!(title || body)) {
      return;
    }
    steps.push({ title, body });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (currentBody) {
        currentBody += "\n\n";
      }
      continue;
    }

    const maybeTitle = getReasoningStepTitle(line);
    if (maybeTitle) {
      pushCurrent();
      currentTitle = maybeTitle;
      currentBody = "";
      continue;
    }

    if (
      implicitTitle &&
      !currentTitle &&
      !currentBody &&
      line === implicitTitle.match
    ) {
      currentTitle = implicitTitle.title;
      continue;
    }

    if (!currentTitle) {
      currentTitle = "Reasoning";
    }

    currentBody += (currentBody ? "\n" : "") + rawLine;
  }

  pushCurrent();

  const normalized = steps
    .map((s) => ({
      title: s.title || "Reasoning",
      items: splitReasoningBodyIntoItems(s.body),
    }))
    .filter((s) => s.items.length > 0);

  return normalized.length > 0 ? normalized : null;
}

// Individual part renderers for sequential rendering
const renderTextPart = (
  part: { type: "text"; text: string },
  index: number,
  id: string
) => (
  <MessageContent
    className="prose dark:prose-invert relative max-w-prose bg-transparent p-0"
    id={`${id}-text-${index}`}
    key={`text-${index}`}
    markdown={true}
  >
    {part.text}
  </MessageContent>
);

const renderReasoningPart = (
  part: ReasoningUIPart,
  index: number,
  id: string,
  isPartStreaming: boolean,
  isLastMetaBlock: boolean
) => {
  const steps = parseReasoningIntoSteps(part.text);

  if (!steps) {
    return null;
  }

  return (
    <div
      className={cn(
        "my-1 w-full max-w-prose space-y-1",
        isLastMetaBlock && "mb-6"
      )}
      key={`reasoning-${index}`}
    >
      {steps.map((step, stepIndex) => {
        const isActiveStep = stepIndex === steps.length - 1;
        const showShimmer = isPartStreaming && isActiveStep;

        return (
          <Collapsible defaultOpen={false} key={`${step.title}-${stepIndex}`}>
            <div>
              <CollapsibleTrigger className="group flex items-center gap-2 py-1 transition-colors">
                {showShimmer ? (
                  <span className="relative flex size-4 items-center justify-center">
                    <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary/30" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                ) : (
                  <div className="flex size-4 items-center justify-center">
                    <div className="size-1.5 rounded-full bg-muted-foreground" />
                  </div>
                )}
                <span className="font-medium text-muted-foreground text-sm">
                  {showShimmer ? (
                    <TextShimmer className="text-sm" duration={2}>
                      {step.title}
                    </TextShimmer>
                  ) : (
                    step.title
                  )}
                </span>
                <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in">
                <div className="space-y-2 py-1 pl-6">
                  {step.items.map((item, itemIndex) => (
                    <Markdown
                      className="prose prose-sm dark:prose-invert max-w-none prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:text-foreground text-muted-foreground prose-code:before:content-none prose-code:after:content-none [&_li]:my-0 [&_ol]:my-0 [&_p]:my-0 [&_ul]:my-0"
                      id={`${id}-reasoning-${index}-step-${stepIndex}-item-${itemIndex}`}
                      key={`${step.title}-${stepIndex}-${itemIndex}`}
                    >
                      {item}
                    </Markdown>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
};

const renderFilePart = (part: FileUIPart, index: number) => {
  const filename = part.filename || "file";
  const isPdf = part.mediaType === "application/pdf";
  const isImage = part.mediaType?.startsWith("image/");

  if (isPdf) {
    return (
      <a
        className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 p-2 transition-colors hover:border-border hover:bg-muted"
        download={filename}
        href={part.url as string}
        key={`file-${index}`}
      >
        <FileText className="h-5 w-5 text-destructive" />
        <span className="text-sm">{filename}</span>
      </a>
    );
  }

  if (isImage && part.url) {
    return (
      <MorphingDialogContainer key={`file-${index}`}>
        <MorphingDialog>
          <MorphingDialogTrigger>
            <Image
              alt={filename}
              className="max-h-96 max-w-full rounded-lg object-contain"
              height={400}
              src={part.url as string}
              unoptimized
              width={400}
            />
          </MorphingDialogTrigger>
          <MorphingDialogContent className="flex items-center justify-center">
            <MorphingDialogImage
              alt={filename}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              src={part.url as string}
              style={{ objectFit: "contain" }}
            />
            <MorphingDialogClose className="absolute top-4 right-4" />
          </MorphingDialogContent>
        </MorphingDialog>
      </MorphingDialogContainer>
    );
  }

  return null;
};

const _renderSourceUrlPart = (
  _part: SourceUrlUIPart,
  index: number,
  allParts: MessageType["parts"]
) => {
  // Collect all consecutive source URL parts
  const sources = allParts
    ?.filter((p): p is SourceUrlUIPart => p.type === "source-url")
    .map((p) => ({
      url: p.url,
      title: p.title,
    }));

  if (!sources?.length || index !== 0) {
    return null;
  }

  return <SourcesList key="sources" sources={sources} />;
};

function SearchIndicator({
  isLoading,
  resultsCount,
}: {
  isLoading: boolean;
  resultsCount: number | null;
}) {
  const text = resultsCount !== null ? `${resultsCount} results` : "Searching…";

  return (
    <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
      <Search className="size-4" />
      {isLoading ? (
        <TextShimmer className="text-sm" duration={2}>
          {text}
        </TextShimmer>
      ) : (
        <span>{text}</span>
      )}
      <Globe className="size-4" />
      <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
    </span>
  );
}

const renderErrorPart = (part: ErrorUIPart, index: number) => (
  <div
    className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
    key={`error-${index}`}
  >
    <p className="font-medium text-destructive">{part.error.message}</p>
  </div>
);

const renderToolPart = (
  part: ToolUIPart,
  index: number,
  isLastMetaBlock: boolean
) => {
  const toolCallId = getToolCallId(part) ?? String(index);
  const toolName = getToolName(part);
  const state = getToolState(part);

  if (toolName === "search") {
    const toolInput = getToolInput(part);
    const toolOutput = getToolOutput(part);
    const query = isSearchToolInput(toolInput) ? toolInput.query : null;
    const output = isSearchToolResult(toolOutput) ? toolOutput : null;
    const results = output?.results ?? null;
    const errorText = getToolErrorText(part);

    const isLoading =
      state === "input-streaming" ||
      state === "input-available" ||
      state === null;
    const isError = state === "output-error";

    const resultsCount = results ? results.length : null;

    return (
      <div
        className={cn("my-1 w-full max-w-prose", isLastMetaBlock && "mb-6")}
        key={`tool-search-${toolCallId}`}
      >
        <Collapsible defaultOpen={false}>
          {/* Inline search indicator */}
          <CollapsibleTrigger className="group flex w-full items-center gap-2 py-1 transition-colors">
            <SearchIndicator
              isLoading={isLoading}
              resultsCount={resultsCount}
            />
          </CollapsibleTrigger>

          {/* Expandable results */}
          <CollapsibleContent className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 mt-2 overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in">
            <div className="rounded-lg border border-border">
              {/* Header */}
              <div className="border-border border-b px-3 py-2 font-medium text-sm">
                {query ? `Searched for "${query}"` : "Search results"}
              </div>

              {/* Error state */}
              {isError && (
                <div className="px-3 py-2 text-destructive text-sm">
                  {errorText ?? "Search failed."}
                </div>
              )}

              {/* Results list */}
              {!isError && results && results.length > 0 && (
                <div className="flex flex-col">
                  {results.map((result) => {
                    const domain = getHostname(result.url);
                    const faviconUrl = getFaviconUrl(result.url);
                    const href = addUtm(result.url);
                    const title = result.title || domain;

                    return (
                      <a
                        className="flex items-start gap-2 px-3 py-2 transition-colors hover:bg-muted/50"
                        href={href}
                        key={`${result.url}-${title}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {/* biome-ignore lint/performance/noImgElement: Favicons should use native img for better caching */}
                        <img
                          alt={`${domain}`}
                          className="mt-0.5 size-4 shrink-0 rounded"
                          decoding="async"
                          height={16}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          src={faviconUrl}
                          width={16}
                        />
                        <span className="min-w-0 flex-1 break-words text-sm">
                          {title}
                        </span>
                        <span className="shrink-0 text-muted-foreground text-xs">
                          {domain}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {!isError && state === "output-available" && !results?.length && (
                <div className="px-3 py-2 text-muted-foreground text-sm">
                  No results found.
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  const isLoading =
    state === "input-streaming" ||
    state === "input-available" ||
    state === null;
  const label = toolName ?? "Tool";

  return (
    <div
      className={cn(
        "my-1 flex items-center gap-2 py-1 text-muted-foreground text-sm",
        isLastMetaBlock && "mb-6"
      )}
      key={`tool-${toolCallId}`}
    >
      {isLoading ? (
        <span className="relative flex size-4 items-center justify-center">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary/30" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      ) : (
        <Check className="size-4" />
      )}
      <span>
        {isLoading ? (
          <TextShimmer className="text-sm" duration={2}>
            Running {label}…
          </TextShimmer>
        ) : (
          `${label} completed`
        )}
      </span>
    </div>
  );
};

function MessageAssistantComponent({
  isLast,
  hasScrollAnchor,
  copied,
  copyToClipboard,
  onReload,
  parts,
  status,
  id,
  readOnly,
}: MessageAssistantProps) {
  const isStreaming = status === "streaming" || status === "submitted";
  const hasError = status === "error";
  const hasAnyText = parts?.some(
    (p) => p.type === "text" && p.text.trim().length > 0
  );

  // Collect sources
  const sources = useMemo(
    () =>
      parts
        ?.filter((p) => p.type === "source-url")
        .map((p) => ({
          url: (p as SourceUrlUIPart).url,
          title: (p as SourceUrlUIPart).title,
        })) || [],
    [parts]
  );

  const firstSourceUrlPartIndex = useMemo(
    () => parts?.findIndex((p) => p.type === "source-url") ?? -1,
    [parts]
  );

  const lastReasoningPartIndex = useMemo(() => {
    if (!parts) {
      return -1;
    }

    let lastIndex = -1;
    for (const [partIndex, part] of parts.entries()) {
      if (part.type === "reasoning") {
        lastIndex = partIndex;
      }
    }

    return lastIndex;
  }, [parts]);

  const lastMetaPartIndex = useMemo(() => {
    if (!parts) {
      return -1;
    }

    let lastIndex = -1;
    for (const [partIndex, part] of parts.entries()) {
      if (
        part.type === "reasoning" ||
        part.type === "tool-invocation" ||
        (typeof part.type === "string" && part.type.startsWith("tool-")) ||
        part.type === "source-url"
      ) {
        lastIndex = partIndex;
      }
    }

    return lastIndex;
  }, [parts]);

  return (
    <Message
      className={cn(
        "group relative flex w-full max-w-3xl flex-col items-start gap-2 px-4 pb-2 md:px-6",
        hasScrollAnchor && "scroll-mt-8"
      )}
      id={id}
    >
      <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        {parts?.map((part, index) => {
          if (
            part.type === "tool-invocation" ||
            (typeof part.type === "string" && part.type.startsWith("tool-"))
          ) {
            return renderToolPart(
              part as ToolUIPart,
              index,
              index === lastMetaPartIndex
            );
          }

          switch (part.type) {
            case "text":
              return renderTextPart(part, index, id);
            case "reasoning":
              return renderReasoningPart(
                part,
                index,
                id,
                isStreaming &&
                  isLast === true &&
                  index === lastReasoningPartIndex,
                index === lastMetaPartIndex
              );
            case "file":
              return renderFilePart(part, index);
            case "source-url": {
              const isLastMetaBlock =
                parts[lastMetaPartIndex]?.type === "source-url";
              return index === firstSourceUrlPartIndex && sources.length > 0 ? (
                <SourcesList
                  className={cn("mt-1", isLastMetaBlock && "mb-10")}
                  key="sources"
                  sources={sources}
                />
              ) : null;
            }
            default:
              if ((part as unknown as ErrorUIPart).type === "error") {
                return renderErrorPart(part as unknown as ErrorUIPart, index);
              }
              return null;
          }
        })}

        {/* Retry Button for Error State */}
        {hasError && isLast && onReload && (
          <div className="mt-2 flex items-center gap-2">
            <Button
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={onReload}
              size="sm"
              variant="outline"
            >
              <RotateCw className="mr-2 size-4" />
              Retry
            </Button>
            <span className="text-muted-foreground text-xs">
              Failed to generate response.
            </span>
          </div>
        )}

        {!readOnly && hasAnyText && !isStreaming && !hasError && (
          <MessageActions className="mt-2">
            {onReload && (
              <MessageAction tooltip="Regenerate">
                <button
                  className="p-1 text-muted-foreground hover:text-foreground"
                  onClick={onReload}
                  type="button"
                >
                  <RotateCw className="size-4" />
                </button>
              </MessageAction>
            )}
            {copyToClipboard && (
              <MessageAction tooltip={copied ? "Copied!" : "Copy"}>
                <button
                  className="p-1 text-muted-foreground hover:text-foreground"
                  onClick={copyToClipboard}
                  type="button"
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </MessageAction>
            )}
          </MessageActions>
        )}
      </div>
    </Message>
  );
}

export const MessageAssistant = memo(MessageAssistantComponent);
