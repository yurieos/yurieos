/**
 * DBLP Computer Science Bibliography Tools
 *
 * Provides access to computer science publications:
 *
 * 1. DBLP - Comprehensive CS bibliography with 6M+ publications
 *    @see https://dblp.org/
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const DBLP_API_BASE = "https://dblp.org/search";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 100;

// =============================================================================
// Types
// =============================================================================

type DblpHitInfo = {
  authors?: {
    author: Array<{ text: string }> | { text: string };
  };
  title?: string;
  venue?: string;
  year?: string;
  type?: string;
  key?: string;
  doi?: string;
  ee?: string | string[];
  url?: string;
  pages?: string;
  number?: string;
  volume?: string;
};

type DblpHit = {
  "@score": string;
  "@id": string;
  info: DblpHitInfo;
};

type DblpResult = {
  result: {
    hits?: {
      "@total": string;
      "@computed": string;
      hit?: DblpHit[];
    };
  };
};

type DblpAuthorInfo = {
  author: string;
  url?: string;
  aliases?: { alias: string | string[] };
  notes?: {
    note?:
      | Array<{ "@type": string; text: string }>
      | { "@type": string; text: string };
  };
};

type DblpAuthorHit = {
  "@score": string;
  "@id": string;
  info: DblpAuthorInfo;
};

type DblpAuthorResult = {
  result: {
    hits?: {
      "@total": string;
      hit?: DblpAuthorHit[];
    };
  };
};

// =============================================================================
// Helpers
// =============================================================================

function extractAuthors(authors: DblpHitInfo["authors"]): string[] {
  if (!authors?.author) return [];
  const authorData = authors.author;
  if (Array.isArray(authorData)) {
    return authorData.map((a) => a.text);
  }
  return [authorData.text];
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function formatPublicationMarkdown(hit: DblpHit): string {
  const info = hit.info;
  const parts: string[] = [];

  // Title with link
  const title = info.title || "Untitled";
  const url = info.ee
    ? Array.isArray(info.ee)
      ? info.ee[0]
      : info.ee
    : info.url || `https://dblp.org/${info.key}`;

  parts.push(`### [${truncateText(title, 150)}](${url})`);

  // Authors
  const authors = extractAuthors(info.authors);
  if (authors.length > 0) {
    const authorList =
      authors.length > 5
        ? `${authors.slice(0, 5).join(", ")} et al.`
        : authors.join(", ");
    parts.push(`**Authors:** ${authorList}`);
  }

  // Publication details
  const details: string[] = [];
  if (info.year) details.push(`**Year:** ${info.year}`);
  if (info.venue) details.push(`**Venue:** ${info.venue}`);
  if (info.type) details.push(`**Type:** ${info.type}`);

  if (details.length > 0) {
    parts.push(details.join(" | "));
  }

  // DOI
  if (info.doi) {
    parts.push(`**DOI:** [${info.doi}](https://doi.org/${info.doi})`);
  }

  // Volume/pages
  const pubDetails: string[] = [];
  if (info.volume) pubDetails.push(`Vol. ${info.volume}`);
  if (info.number) pubDetails.push(`No. ${info.number}`);
  if (info.pages) pubDetails.push(`pp. ${info.pages}`);
  if (pubDetails.length > 0) {
    parts.push(pubDetails.join(", "));
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search DBLP Publications
// =============================================================================

export type DblpPublicationItem = {
  id: string;
  score: number;
  title: string;
  authors: string[];
  year?: string;
  venue?: string;
  type?: string;
  doi?: string;
  url: string;
};

export type DblpSearchResult = {
  success: boolean;
  query: string;
  total: number;
  publications: DblpPublicationItem[];
  error?: string;
  markdown: string;
};

export const dblpSearchTool = tool({
  description:
    "Search DBLP for computer science publications. " +
    "DBLP is the most comprehensive CS bibliography with 6M+ publications. " +
    "Use for: finding papers on algorithms, machine learning, systems, databases, " +
    "programming languages, security, and all CS topics. " +
    "Returns title, authors, venue, year, and DOI.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for CS publications. " +
          "Examples: 'deep learning transformers', 'graph neural networks', " +
          "'distributed systems consensus', 'programming language types'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results to return (1-${MAX_RESULTS_LIMIT}).`),
    year: z
      .number()
      .int()
      .min(1950)
      .max(2030)
      .optional()
      .describe("Filter by publication year."),
  }),
  execute: async ({ query, limit, year }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build search query
      let searchQuery = query;
      if (year) {
        searchQuery += ` year:${year}`;
      }

      const params = new URLSearchParams({
        q: searchQuery,
        h: searchLimit.toString(),
        format: "json",
      });

      const response = await fetch(
        `${DBLP_API_BASE}/publ/api?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DBLP API error: ${response.status}`);
      }

      const data = (await response.json()) as DblpResult;

      if (!data.result?.hits?.hit?.length) {
        return {
          success: true,
          query,
          total: 0,
          publications: [],
          error: "No publications found. Try different search terms.",
          markdown: `No CS publications found for "${query}".`,
        } satisfies DblpSearchResult;
      }

      const hits = data.result.hits.hit;
      const total = Number.parseInt(data.result.hits["@total"] || "0", 10);

      const publications: DblpPublicationItem[] = hits.map((hit) => {
        const info = hit.info;
        const url = info.ee
          ? Array.isArray(info.ee)
            ? info.ee[0]
            : info.ee
          : info.url || `https://dblp.org/${info.key}`;

        return {
          id: hit["@id"],
          score: Number.parseFloat(hit["@score"]),
          title: info.title || "Untitled",
          authors: extractAuthors(info.authors),
          year: info.year,
          venue: info.venue,
          type: info.type,
          doi: info.doi,
          url,
        };
      });

      // Build markdown
      let markdown = `### DBLP Search: "${query}"\n\n`;
      markdown += `Found ${total.toLocaleString()} publications (showing ${publications.length}).\n\n`;

      for (const pub of publications) {
        markdown +=
          formatPublicationMarkdown(hits[publications.indexOf(pub)]) +
          "\n\n---\n\n";
      }

      markdown += "*Source: DBLP Computer Science Bibliography*";

      return {
        success: true,
        query,
        total,
        publications,
        markdown,
      } satisfies DblpSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        publications: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies DblpSearchResult;
    }
  },
});

// =============================================================================
// Tool: Search DBLP Authors
// =============================================================================

export type DblpAuthorItem = {
  id: string;
  score: number;
  name: string;
  aliases: string[];
  url: string;
  affiliations: string[];
};

export type DblpAuthorSearchResult = {
  success: boolean;
  query: string;
  total: number;
  authors: DblpAuthorItem[];
  error?: string;
  markdown: string;
};

export const dblpAuthorSearchTool = tool({
  description:
    "Search DBLP for computer science authors/researchers. " +
    "Find CS researchers, their publication profiles, and affiliations. " +
    "Returns author names, aliases, and links to their publication lists.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Author name to search. " +
          "Examples: 'Yoshua Bengio', 'Jeff Dean', 'Barbara Liskov'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        h: searchLimit.toString(),
        format: "json",
      });

      const response = await fetch(
        `${DBLP_API_BASE}/author/api?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DBLP API error: ${response.status}`);
      }

      const data = (await response.json()) as DblpAuthorResult;

      if (!data.result?.hits?.hit?.length) {
        return {
          success: true,
          query,
          total: 0,
          authors: [],
          error: "No authors found. Try different search terms.",
          markdown: `No CS authors found for "${query}".`,
        } satisfies DblpAuthorSearchResult;
      }

      const hits = data.result.hits.hit;
      const total = Number.parseInt(data.result.hits["@total"] || "0", 10);

      const authors: DblpAuthorItem[] = hits.map((hit) => {
        const info = hit.info;

        // Extract aliases
        let aliases: string[] = [];
        if (info.aliases?.alias) {
          const aliasData = info.aliases.alias;
          aliases = Array.isArray(aliasData) ? aliasData : [aliasData];
        }

        // Extract affiliations from notes
        const affiliations: string[] = [];
        if (info.notes?.note) {
          const notes = Array.isArray(info.notes.note)
            ? info.notes.note
            : [info.notes.note];
          for (const note of notes) {
            if (note["@type"] === "affiliation" && note.text) {
              affiliations.push(note.text);
            }
          }
        }

        return {
          id: hit["@id"],
          score: Number.parseFloat(hit["@score"]),
          name: info.author,
          aliases,
          url:
            info.url ||
            `https://dblp.org/search?q=${encodeURIComponent(info.author)}`,
          affiliations,
        };
      });

      // Build markdown
      let markdown = `### DBLP Author Search: "${query}"\n\n`;
      markdown += `Found ${total.toLocaleString()} authors (showing ${authors.length}).\n\n`;

      for (const author of authors) {
        markdown += `**[${author.name}](${author.url})**\n`;
        if (author.aliases.length > 0) {
          markdown += `*Also known as:* ${author.aliases.join(", ")}\n`;
        }
        if (author.affiliations.length > 0) {
          markdown += `*Affiliations:* ${author.affiliations.join("; ")}\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: DBLP Computer Science Bibliography*";

      return {
        success: true,
        query,
        total,
        authors,
        markdown,
      } satisfies DblpAuthorSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        authors: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies DblpAuthorSearchResult;
    }
  },
});

// =============================================================================
// Tool: Search DBLP Venues
// =============================================================================

export type DblpVenueItem = {
  id: string;
  score: number;
  name: string;
  acronym?: string;
  type?: string;
  url: string;
};

export type DblpVenueSearchResult = {
  success: boolean;
  query: string;
  total: number;
  venues: DblpVenueItem[];
  error?: string;
  markdown: string;
};

export const dblpVenueSearchTool = tool({
  description:
    "Search DBLP for computer science venues (conferences and journals). " +
    "Find information about CS conferences like NeurIPS, ICML, SIGMOD, " +
    "or journals like JACM, TODS, TPAMI.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Venue name or acronym. " +
          "Examples: 'NeurIPS', 'SIGMOD', 'Journal of Machine Learning', 'ICSE'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        h: searchLimit.toString(),
        format: "json",
      });

      const response = await fetch(
        `${DBLP_API_BASE}/venue/api?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DBLP API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.result?.hits?.hit?.length) {
        return {
          success: true,
          query,
          total: 0,
          venues: [],
          error: "No venues found. Try different search terms.",
          markdown: `No CS venues found for "${query}".`,
        } satisfies DblpVenueSearchResult;
      }

      const hits = data.result.hits.hit;
      const total = Number.parseInt(data.result.hits["@total"] || "0", 10);

      const venues: DblpVenueItem[] = hits.map(
        (hit: {
          "@id": string;
          "@score": string;
          info: {
            venue: string;
            acronym?: string;
            type?: string;
            url?: string;
          };
        }) => ({
          id: hit["@id"],
          score: Number.parseFloat(hit["@score"]),
          name: hit.info.venue,
          acronym: hit.info.acronym,
          type: hit.info.type,
          url:
            hit.info.url ||
            `https://dblp.org/search?q=${encodeURIComponent(hit.info.venue)}`,
        })
      );

      // Build markdown
      let markdown = `### DBLP Venue Search: "${query}"\n\n`;
      markdown += `Found ${total.toLocaleString()} venues (showing ${venues.length}).\n\n`;

      for (const venue of venues) {
        markdown += `**[${venue.name}](${venue.url})**`;
        if (venue.acronym) markdown += ` (${venue.acronym})`;
        markdown += "\n";
        if (venue.type) markdown += `*Type:* ${venue.type}\n`;
        markdown += "\n";
      }

      markdown += "*Source: DBLP Computer Science Bibliography*";

      return {
        success: true,
        query,
        total,
        venues,
        markdown,
      } satisfies DblpVenueSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        venues: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies DblpVenueSearchResult;
    }
  },
});
