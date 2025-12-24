/**
 * Open Access Research Tools
 *
 * Provides access to open access research repositories:
 *
 * 1. CORE - 280M+ open access research papers
 *    @see https://core.ac.uk/services/api
 *
 * API key is required for CORE (free registration).
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const CORE_API_BASE = "https://api.core.ac.uk/v3";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 20;
const MAX_ABSTRACT_LENGTH = 2000;

// =============================================================================
// Types
// =============================================================================

type CoreAuthor = {
  name: string;
};

type CoreWork = {
  id: string;
  doi?: string;
  title?: string;
  authors?: CoreAuthor[];
  abstract?: string;
  yearPublished?: number;
  publishedDate?: string;
  publisher?: string;
  journals?: Array<{ title?: string }>;
  downloadUrl?: string;
  sourceFulltextUrls?: string[];
  documentType?: string;
  language?: {
    code?: string;
    name?: string;
  };
  citationCount?: number;
  fieldOfStudy?: string;
};

type CoreSearchResponse = {
  totalHits: number;
  results: CoreWork[];
};

// =============================================================================
// Helpers
// =============================================================================

function getApiKey(): string {
  const apiKey = process.env.CORE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "CORE API requires an API key. Get one free at https://core.ac.uk/services/api and set CORE_API_KEY."
    );
  }
  return apiKey;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(". ");
  const cutPoint = lastPeriod > maxLength * 0.7 ? lastPeriod + 1 : maxLength;
  return `${truncated.slice(0, cutPoint)}...`;
}

function formatCoreMarkdown(work: CoreWork): string {
  const parts: string[] = [];

  // Title with link
  const title = work.title || "Untitled";
  const url =
    work.downloadUrl ||
    work.sourceFulltextUrls?.[0] ||
    (work.doi
      ? `https://doi.org/${work.doi}`
      : `https://core.ac.uk/works/${work.id}`);
  parts.push(`### [${title}](${url})`);

  // Authors
  if (work.authors?.length) {
    const authorList = work.authors
      .slice(0, 5)
      .map((a) => a.name)
      .join(", ");
    const moreAuthors =
      work.authors.length > 5 ? ` et al. (+${work.authors.length - 5})` : "";
    parts.push(`**Authors:** ${authorList}${moreAuthors}`);
  }

  // Metadata
  const meta: string[] = [];
  if (work.yearPublished) {
    meta.push(`**Year:** ${work.yearPublished}`);
  }
  if (work.journals?.[0]?.title) {
    meta.push(`**Journal:** ${work.journals[0].title}`);
  }
  if (work.publisher) {
    meta.push(`**Publisher:** ${work.publisher}`);
  }
  meta.push("🔓 Open Access");
  if (meta.length > 0) {
    parts.push(meta.join(" | "));
  }

  // Field of study
  if (work.fieldOfStudy) {
    parts.push(`**Field:** ${work.fieldOfStudy}`);
  }

  // Abstract
  if (work.abstract) {
    const truncatedAbstract = truncateText(work.abstract, MAX_ABSTRACT_LENGTH);
    parts.push(`**Abstract:** ${truncatedAbstract}`);
  }

  // IDs
  const ids: string[] = [`CORE: ${work.id}`];
  if (work.doi) {
    ids.push(`DOI: ${work.doi}`);
  }
  parts.push(`*${ids.join(" • ")}*`);

  // Download link
  if (work.downloadUrl) {
    parts.push(`📄 [Download PDF](${work.downloadUrl})`);
  }

  return parts.join("\n");
}

async function coreRequest<T>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<T> {
  const apiKey = getApiKey();

  const url = `${CORE_API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `CORE API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// Tool: Search CORE Open Access Papers
// =============================================================================

export type CoreSearchResultItem = {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  publisher?: string;
  abstract?: string;
  doi?: string;
  downloadUrl?: string;
  documentType?: string;
  url: string;
  markdown: string;
};

export type CoreSearchResult = {
  success: boolean;
  query: string;
  total: number;
  papers: CoreSearchResultItem[];
  error?: string;
};

export const coreSearchTool = tool({
  description:
    "Search CORE for open access research papers. " +
    "CORE aggregates 280M+ open access papers from repositories worldwide. " +
    "All results are freely accessible with full-text available. " +
    "Use for: finding free research papers, accessing full-text academic content, " +
    "literature reviews with guaranteed open access.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for open access papers. Use specific terms. " +
          "Examples: 'machine learning healthcare', 'climate change adaptation', " +
          "'renewable energy policy'"
      ),
    yearFrom: z
      .number()
      .int()
      .min(1900)
      .max(2030)
      .optional()
      .describe("Filter papers from this year onwards."),
    yearTo: z
      .number()
      .int()
      .min(1900)
      .max(2030)
      .optional()
      .describe("Filter papers up to this year."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum papers to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, yearFrom, yearTo, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build query with filters
      let searchQuery = query;
      if (yearFrom) {
        searchQuery += ` yearPublished>=${yearFrom}`;
      }
      if (yearTo) {
        searchQuery += ` yearPublished<=${yearTo}`;
      }

      const response = await coreRequest<CoreSearchResponse>(
        `/search/works?q=${encodeURIComponent(searchQuery)}&limit=${searchLimit}`,
        "GET"
      );

      if (!response.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          papers: [],
          error:
            "No open access papers found for this query. Try different search terms.",
        } satisfies CoreSearchResult;
      }

      const papers: CoreSearchResultItem[] = response.results.map((work) => ({
        id: work.id,
        title: work.title || "Untitled",
        authors: work.authors?.map((a) => a.name) || [],
        year: work.yearPublished,
        journal: work.journals?.[0]?.title,
        publisher: work.publisher,
        abstract: work.abstract,
        doi: work.doi,
        downloadUrl: work.downloadUrl,
        documentType: work.documentType,
        url:
          work.downloadUrl ||
          work.sourceFulltextUrls?.[0] ||
          (work.doi
            ? `https://doi.org/${work.doi}`
            : `https://core.ac.uk/works/${work.id}`),
        markdown: formatCoreMarkdown(work),
      }));

      return {
        success: true,
        query,
        total: response.totalHits,
        papers,
      } satisfies CoreSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        papers: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies CoreSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get CORE Paper Details
// =============================================================================

export type CorePaperDetailsResult = {
  success: boolean;
  id: string;
  paper?: CoreSearchResultItem & {
    fullAbstract?: string;
    language?: string;
    citationCount?: number;
  };
  error?: string;
};

export const getCorePaperTool = tool({
  description:
    "Get detailed information about a specific open access paper by CORE ID. " +
    "Use this after searching CORE to get full paper details and download links.",
  inputSchema: z.object({
    id: z.string().min(1).describe("CORE work ID. Example: '123456789'"),
  }),
  execute: async ({ id }) => {
    try {
      const response = await coreRequest<CoreWork>(`/works/${id}`, "GET");

      if (!response) {
        return {
          success: false,
          id,
          error: `Paper not found with CORE ID: ${id}`,
        } satisfies CorePaperDetailsResult;
      }

      const paper = {
        id: response.id,
        title: response.title || "Untitled",
        authors: response.authors?.map((a) => a.name) || [],
        year: response.yearPublished,
        journal: response.journals?.[0]?.title,
        publisher: response.publisher,
        abstract: response.abstract,
        doi: response.doi,
        downloadUrl: response.downloadUrl,
        documentType: response.documentType,
        url:
          response.downloadUrl ||
          response.sourceFulltextUrls?.[0] ||
          (response.doi
            ? `https://doi.org/${response.doi}`
            : `https://core.ac.uk/works/${response.id}`),
        markdown: formatCoreMarkdown(response),
        fullAbstract: response.abstract,
        language: response.language?.name,
        citationCount: response.citationCount,
      };

      return {
        success: true,
        id,
        paper,
      } satisfies CorePaperDetailsResult;
    } catch (error) {
      return {
        success: false,
        id,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies CorePaperDetailsResult;
    }
  },
});
