/**
 * Knowledge Base Tools
 *
 * Provides access to encyclopedic and general knowledge sources:
 *
 * 1. Wikipedia - Free encyclopedia with structured summaries
 *    @see https://www.mediawiki.org/wiki/API:Main_page
 *
 * 2. Wikidata - Structured knowledge base
 *    @see https://www.wikidata.org/wiki/Wikidata:Data_access
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const WIKIPEDIA_API_BASE = "https://en.wikipedia.org/w/api.php";

const MAX_EXTRACT_LENGTH = 4000;
const MAX_SEARCH_RESULTS = 10;

// =============================================================================
// Types
// =============================================================================

type WikipediaSearchResult = {
  pageid: number;
  title: string;
  snippet: string;
  size: number;
  wordcount: number;
  timestamp: string;
};

type WikipediaSearchResponse = {
  query?: {
    search: WikipediaSearchResult[];
    searchinfo?: {
      totalhits: number;
    };
  };
};

type WikipediaPage = {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  categories?: Array<{ title: string }>;
  links?: Array<{ title: string }>;
  images?: Array<{ title: string }>;
  coordinates?: Array<{
    lat: number;
    lon: number;
  }>;
};

type WikipediaPageResponse = {
  query?: {
    pages: Record<string, WikipediaPage>;
  };
};

type WikipediaSummary = {
  type: string;
  title: string;
  displaytitle: string;
  extract: string;
  extract_html: string;
  description?: string;
  content_urls?: {
    desktop: { page: string };
    mobile: { page: string };
  };
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
};

// =============================================================================
// Helpers
// =============================================================================

function cleanWikiText(text: string): string {
  // Remove HTML tags but preserve structure
  let cleaned = text
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();

  // Truncate if too long
  if (cleaned.length > MAX_EXTRACT_LENGTH) {
    const truncated = cleaned.slice(0, MAX_EXTRACT_LENGTH);
    const lastPeriod = truncated.lastIndexOf(". ");
    const cutPoint =
      lastPeriod > MAX_EXTRACT_LENGTH * 0.7
        ? lastPeriod + 1
        : MAX_EXTRACT_LENGTH;
    cleaned = `${truncated.slice(0, cutPoint)}...`;
  }

  return cleaned;
}

function formatWikipediaMarkdown(
  title: string,
  extract: string,
  url: string,
  description?: string,
  categories?: string[]
): string {
  const parts: string[] = [];

  // Title with link
  parts.push(`### [${title}](${url})`);

  // Description if available
  if (description) {
    parts.push(`*${description}*`);
  }

  // Categories
  if (categories && categories.length > 0) {
    const cats = categories.slice(0, 5).join(", ");
    parts.push(`**Categories:** ${cats}`);
  }

  parts.push("---");

  // Content
  parts.push(extract);

  // Source attribution
  parts.push(`\n*Source: [Wikipedia](${url})*`);

  return parts.join("\n\n");
}

// =============================================================================
// Tool: Wikipedia Search
// =============================================================================

export type WikipediaSearchResultItem = {
  pageId: number;
  title: string;
  snippet: string;
  url: string;
  wordCount: number;
};

export type WikipediaSearchToolResult = {
  success: boolean;
  query: string;
  total: number;
  results: WikipediaSearchResultItem[];
  error?: string;
};

export const wikipediaSearchTool = tool({
  description:
    "Search Wikipedia for encyclopedic articles and general knowledge. " +
    "Use this for: quick factual lookups, background information, historical context, " +
    "biographical information, concept definitions, and general knowledge questions. " +
    "Returns article summaries with links to full articles.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for Wikipedia. Use specific terms or topics. " +
          "Examples: 'quantum computing', 'World War II causes', " +
          "'Marie Curie biography', 'photosynthesis process'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_SEARCH_RESULTS)
      .optional()
      .default(5)
      .describe(`Maximum number of results (1-${MAX_SEARCH_RESULTS}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(limit ?? 5, MAX_SEARCH_RESULTS);

      const params = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: query,
        srlimit: searchLimit.toString(),
        format: "json",
        origin: "*",
      });

      const response = await fetch(
        `${WIKIPEDIA_API_BASE}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`);
      }

      const data = (await response.json()) as WikipediaSearchResponse;

      if (!data.query?.search?.length) {
        return {
          success: true,
          query,
          total: 0,
          results: [],
          error: "No Wikipedia articles found. Try different search terms.",
        } satisfies WikipediaSearchToolResult;
      }

      const results: WikipediaSearchResultItem[] = data.query.search.map(
        (item) => ({
          pageId: item.pageid,
          title: item.title,
          snippet: cleanWikiText(item.snippet),
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replaceAll(" ", "_"))}`,
          wordCount: item.wordcount,
        })
      );

      return {
        success: true,
        query,
        total: data.query.searchinfo?.totalhits || results.length,
        results,
      } satisfies WikipediaSearchToolResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        results: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies WikipediaSearchToolResult;
    }
  },
});

// =============================================================================
// Tool: Get Wikipedia Article
// =============================================================================

export type WikipediaArticleResult = {
  success: boolean;
  title: string;
  content?: string;
  summary?: string;
  url?: string;
  categories?: string[];
  relatedLinks?: string[];
  markdown?: string;
  error?: string;
};

export const getWikipediaArticleTool = tool({
  description:
    "Get the full content of a specific Wikipedia article by title. " +
    "Use this after searching Wikipedia to get detailed information about a topic. " +
    "Returns the article extract with structure preserved.",
  inputSchema: z.object({
    title: z
      .string()
      .min(1)
      .describe(
        "Exact Wikipedia article title. " +
          "Examples: 'Artificial intelligence', 'Albert Einstein', 'Climate change'"
      ),
    sections: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, include section headings in the extract."),
  }),
  execute: async ({ title, sections }) => {
    try {
      // Use Wikipedia REST API for better formatted summaries
      const encodedTitle = encodeURIComponent(title.replaceAll(" ", "_"));
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;

      const summaryResponse = await fetch(summaryUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!summaryResponse.ok) {
        if (summaryResponse.status === 404) {
          return {
            success: false,
            title,
            error: `Wikipedia article not found: "${title}". Try searching for the correct title.`,
          } satisfies WikipediaArticleResult;
        }
        throw new Error(`Wikipedia API error: ${summaryResponse.status}`);
      }

      const summary = (await summaryResponse.json()) as WikipediaSummary;

      // Get additional content from MediaWiki API if sections requested
      let fullContent = summary.extract;
      let categories: string[] = [];

      if (sections) {
        const params = new URLSearchParams({
          action: "query",
          titles: title,
          prop: "extracts|categories",
          exintro: "false",
          explaintext: "true",
          format: "json",
          origin: "*",
        });

        const pageResponse = await fetch(
          `${WIKIPEDIA_API_BASE}?${params.toString()}`
        );

        if (pageResponse.ok) {
          const pageData = (await pageResponse.json()) as WikipediaPageResponse;
          const pages = pageData.query?.pages;

          if (pages) {
            const page = Object.values(pages)[0];
            if (page?.extract) {
              fullContent = cleanWikiText(page.extract);
            }
            if (page?.categories) {
              categories = page.categories
                .map((c) => c.title.replace("Category:", ""))
                .slice(0, 10);
            }
          }
        }
      }

      const url =
        summary.content_urls?.desktop.page ||
        `https://en.wikipedia.org/wiki/${encodedTitle}`;

      const markdown = formatWikipediaMarkdown(
        summary.title || title,
        fullContent,
        url,
        summary.description,
        categories
      );

      return {
        success: true,
        title: summary.title || title,
        content: fullContent,
        summary: summary.extract,
        url,
        categories,
        markdown,
      } satisfies WikipediaArticleResult;
    } catch (error) {
      return {
        success: false,
        title,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies WikipediaArticleResult;
    }
  },
});

// =============================================================================
// Tool: Wikipedia Quick Lookup
// =============================================================================

export type WikipediaQuickLookupResult = {
  success: boolean;
  term: string;
  definition?: string;
  description?: string;
  url?: string;
  error?: string;
};

export const wikipediaLookupTool = tool({
  description:
    "Quick lookup of a term or concept on Wikipedia. " +
    "Returns a brief definition/summary without the full article. " +
    "Use for: quick fact checks, term definitions, brief biographical info. " +
    "Faster than full article retrieval when you just need the basics.",
  inputSchema: z.object({
    term: z
      .string()
      .min(1)
      .describe(
        "Term or concept to look up. " +
          "Examples: 'DNA', 'Renaissance', 'Elon Musk', 'machine learning'"
      ),
  }),
  execute: async ({ term }) => {
    try {
      const encodedTerm = encodeURIComponent(term.replaceAll(" ", "_"));
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTerm}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Try search as fallback
          const searchParams = new URLSearchParams({
            action: "query",
            list: "search",
            srsearch: term,
            srlimit: "1",
            format: "json",
            origin: "*",
          });

          const searchResponse = await fetch(
            `${WIKIPEDIA_API_BASE}?${searchParams.toString()}`
          );

          if (searchResponse.ok) {
            const searchData =
              (await searchResponse.json()) as WikipediaSearchResponse;
            if (searchData.query?.search?.length) {
              const firstResult = searchData.query.search[0];
              return {
                success: true,
                term,
                definition: cleanWikiText(firstResult.snippet),
                description: `Did you mean: ${firstResult.title}?`,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(firstResult.title.replaceAll(" ", "_"))}`,
              } satisfies WikipediaQuickLookupResult;
            }
          }

          return {
            success: false,
            term,
            error: `No Wikipedia article found for "${term}".`,
          } satisfies WikipediaQuickLookupResult;
        }
        throw new Error(`Wikipedia API error: ${response.status}`);
      }

      const data = (await response.json()) as WikipediaSummary;

      return {
        success: true,
        term,
        definition: data.extract,
        description: data.description,
        url:
          data.content_urls?.desktop.page ||
          `https://en.wikipedia.org/wiki/${encodedTerm}`,
      } satisfies WikipediaQuickLookupResult;
    } catch (error) {
      return {
        success: false,
        term,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies WikipediaQuickLookupResult;
    }
  },
});
