import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

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

const MAX_RESULTS_DEFAULT = 5;
const MAX_RESULTS_LIMIT = 10;
const MAX_TEXT_CHARACTERS = 2000;

function getResultsArray(response: unknown): unknown[] {
  if (!response || typeof response !== "object") {
    return [];
  }
  if (!("results" in response)) {
    return [];
  }
  const { results } = response as { results?: unknown };
  return Array.isArray(results) ? results : [];
}

function formatMarkdown(
  item: {
    url?: string;
    title?: string;
    snippet?: string;
    text?: string;
  },
  includeContent: boolean
): string {
  const url = item.url || "#";
  const title = item.title || "Untitled";
  const snippet = item.snippet || "";

  let markdown = `### [${title}](${url})\n${snippet}`;

  if (includeContent && item.text) {
    const truncatedText =
      item.text.length > MAX_TEXT_CHARACTERS
        ? `${item.text.slice(0, MAX_TEXT_CHARACTERS - 3)}...`
        : item.text;

    markdown += `\n\n> ${truncatedText}`;
  }

  return markdown;
}

export const searchTool = tool({
  description:
    "Search the web for up-to-date information and return a list of relevant sources.",
  inputSchema: z.object({
    query: z.string().min(1).describe("A detailed web search query."),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .describe("Maximum number of results to return (1-10)."),
    scrapeContent: z
      .boolean()
      .optional()
      .describe("If true, include extracted page text content (truncated)."),
  }),
  execute: async ({ query, maxResults, scrapeContent }: SearchToolInput) => {
    const apiKey = process.env.EXA_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Search is enabled, but EXA_API_KEY is not set. Add EXA_API_KEY to your environment to use web search."
      );
    }

    const limit = Math.min(
      maxResults ?? MAX_RESULTS_DEFAULT,
      MAX_RESULTS_LIMIT
    );
    const includeContent = scrapeContent ?? false;

    const client = new Exa(apiKey);

    const options: Record<string, unknown> = {
      numResults: limit,
      type: "hybrid",
    };

    if (includeContent) {
      options.text = {
        maxCharacters: MAX_TEXT_CHARACTERS,
      };
    }

    const response = includeContent
      ? await client.searchAndContents(query, options)
      : await client.search(query, options);

    const results = getResultsArray(response);

    const formattedResults: SearchToolResultItem[] = results.map((result) => {
      const item = result as {
        url?: string;
        title?: string;
        snippet?: string;
        text?: string;
      };

      return {
        url: item.url || "",
        title: item.title || "",
        description: item.snippet || "",
        content: includeContent ? item.text : undefined,
        markdown: formatMarkdown(item, includeContent),
      };
    });

    const toolResult: SearchToolResult = {
      results: formattedResults,
    };

    return toolResult;
  },
});
