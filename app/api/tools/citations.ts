/**
 * Citation and DOI Tools
 *
 * Provides access to scholarly metadata and open access discovery:
 *
 * 1. Crossref - 140M+ DOI metadata records, citations, funders
 *    @see https://api.crossref.org/swagger-ui/index.html
 *
 * 2. Unpaywall - Open access discovery for 30M+ papers
 *    @see https://unpaywall.org/products/api
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const CROSSREF_API_BASE = "https://api.crossref.org";
const UNPAYWALL_API_BASE = "https://api.unpaywall.org/v2";

// Polite pool email for better rate limits
const CONTACT_EMAIL = "yurie@research.local";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 20;
const MAX_ABSTRACT_LENGTH = 2000;

// Regex patterns (declared at top level for performance)
const DOI_URL_PREFIX_REGEX = /^https?:\/\/doi\.org\//i;
const DOI_PREFIX_REGEX = /^doi:/i;

// =============================================================================
// Types
// =============================================================================

type CrossrefAuthor = {
  given?: string;
  family?: string;
  name?: string;
  ORCID?: string;
  affiliation?: Array<{ name: string }>;
};

type CrossrefFunder = {
  name: string;
  DOI?: string;
  award?: string[];
};

type CrossrefWork = {
  DOI: string;
  title?: string[];
  author?: CrossrefAuthor[];
  "container-title"?: string[];
  publisher?: string;
  published?: {
    "date-parts"?: number[][];
  };
  type?: string;
  abstract?: string;
  "is-referenced-by-count"?: number;
  "references-count"?: number;
  funder?: CrossrefFunder[];
  license?: Array<{
    URL: string;
    "content-version": string;
  }>;
  link?: Array<{
    URL: string;
    "content-type": string;
  }>;
  subject?: string[];
  URL?: string;
};

type CrossrefSearchResponse = {
  status: string;
  "message-type": string;
  message: {
    "total-results": number;
    items: CrossrefWork[];
  };
};

type CrossrefWorkResponse = {
  status: string;
  message: CrossrefWork;
};

type UnpaywallResponse = {
  doi: string;
  is_oa: boolean;
  oa_status: string;
  best_oa_location?: {
    url: string;
    url_for_pdf?: string;
    license?: string;
    version?: string;
    host_type?: string;
  };
  oa_locations?: Array<{
    url: string;
    url_for_pdf?: string;
    license?: string;
    version?: string;
    host_type?: string;
  }>;
  title?: string;
  journal_name?: string;
  published_date?: string;
};

// =============================================================================
// Helpers
// =============================================================================

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(". ");
  const cutPoint = lastPeriod > maxLength * 0.7 ? lastPeriod + 1 : maxLength;
  return `${truncated.slice(0, cutPoint)}...`;
}

function formatAuthorName(author: CrossrefAuthor): string {
  if (author.name) {
    return author.name;
  }
  const parts: string[] = [];
  if (author.given) {
    parts.push(author.given);
  }
  if (author.family) {
    parts.push(author.family);
  }
  return parts.join(" ") || "Unknown";
}

function formatPublishedDate(
  published?: CrossrefWork["published"]
): string | undefined {
  if (!published?.["date-parts"]?.[0]) {
    return;
  }
  const parts = published["date-parts"][0];
  if (parts.length >= 3) {
    return `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
  }
  if (parts.length >= 2) {
    return `${parts[0]}-${String(parts[1]).padStart(2, "0")}`;
  }
  if (parts.length >= 1) {
    return String(parts[0]);
  }
  return;
}

function formatCrossrefMarkdown(work: CrossrefWork): string {
  const parts: string[] = [];

  // Title with DOI link
  const title = work.title?.[0] || "Untitled";
  const url = work.URL || `https://doi.org/${work.DOI}`;
  parts.push(`### [${title}](${url})`);

  // Authors
  if (work.author?.length) {
    const authorList = work.author.slice(0, 5).map(formatAuthorName).join(", ");
    const moreAuthors =
      work.author.length > 5 ? ` et al. (+${work.author.length - 5})` : "";
    parts.push(`**Authors:** ${authorList}${moreAuthors}`);
  }

  // Metadata line
  const meta: string[] = [];
  const pubDate = formatPublishedDate(work.published);
  if (pubDate) {
    meta.push(`**Published:** ${pubDate}`);
  }
  if (work["container-title"]?.[0]) {
    meta.push(`**Journal:** ${work["container-title"][0]}`);
  }
  if (work.publisher) {
    meta.push(`**Publisher:** ${work.publisher}`);
  }
  if (meta.length > 0) {
    parts.push(meta.join(" | "));
  }

  // Citation counts
  const citations: string[] = [];
  if (work["is-referenced-by-count"] !== undefined) {
    citations.push(
      `**Cited by:** ${work["is-referenced-by-count"].toLocaleString()}`
    );
  }
  if (work["references-count"] !== undefined) {
    citations.push(
      `**References:** ${work["references-count"].toLocaleString()}`
    );
  }
  if (citations.length > 0) {
    parts.push(citations.join(" | "));
  }

  // Funders
  if (work.funder?.length) {
    const funderNames = work.funder
      .slice(0, 3)
      .map((f) => f.name)
      .join(", ");
    const moreFunders =
      work.funder.length > 3 ? ` (+${work.funder.length - 3} more)` : "";
    parts.push(`**Funders:** ${funderNames}${moreFunders}`);
  }

  // Subjects/Topics
  if (work.subject?.length) {
    parts.push(`**Subjects:** ${work.subject.slice(0, 5).join(", ")}`);
  }

  // Abstract
  if (work.abstract) {
    // Remove JATS XML tags from abstract
    const cleanAbstract = work.abstract
      .replaceAll(/<[^>]+>/g, "")
      .replaceAll(/\s+/g, " ")
      .trim();
    const truncatedAbstract = truncateText(cleanAbstract, MAX_ABSTRACT_LENGTH);
    parts.push(`**Abstract:** ${truncatedAbstract}`);
  }

  // DOI
  parts.push(`*DOI: ${work.DOI}*`);

  return parts.join("\n");
}

async function crossrefRequest<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${CROSSREF_API_BASE}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": `Yurie Research Assistant (mailto:${CONTACT_EMAIL})`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("DOI not found in Crossref.");
    }
    if (response.status === 429) {
      throw new Error(
        "Crossref rate limit exceeded. Please wait a moment and try again."
      );
    }
    const errorText = await response.text();
    throw new Error(
      `Crossref API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// Tool: Crossref DOI Lookup
// =============================================================================

export type CrossrefLookupResultItem = {
  doi: string;
  title: string;
  authors: string[];
  journal?: string;
  publisher?: string;
  publishedDate?: string;
  type?: string;
  citedByCount?: number;
  referencesCount?: number;
  funders: string[];
  subjects: string[];
  abstract?: string;
  url: string;
  markdown: string;
};

export type CrossrefLookupResult = {
  success: boolean;
  doi: string;
  work?: CrossrefLookupResultItem;
  error?: string;
};

export const crossrefLookupTool = tool({
  description:
    "Look up scholarly work metadata by DOI via Crossref. " +
    "Returns comprehensive metadata including title, authors, journal, publisher, " +
    "citation counts, funding sources, and references. " +
    "Use for: DOI validation, finding who funded research, getting citation counts, " +
    "verifying publication details. Crossref is the official DOI registration agency.",
  inputSchema: z.object({
    doi: z
      .string()
      .min(1)
      .describe(
        "The DOI to look up. " +
          "Examples: '10.1038/nature12373', '10.1126/science.1157996', '10.1016/j.cell.2020.08.012'"
      ),
  }),
  execute: async ({ doi }) => {
    try {
      // Clean DOI (remove URL prefix if present)
      const cleanDoi = doi
        .replace(DOI_URL_PREFIX_REGEX, "")
        .replace(DOI_PREFIX_REGEX, "")
        .trim();

      const response = await crossrefRequest<CrossrefWorkResponse>(
        `/works/${encodeURIComponent(cleanDoi)}`
      );

      const work = response.message;

      const result: CrossrefLookupResultItem = {
        doi: work.DOI,
        title: work.title?.[0] || "Untitled",
        authors: work.author?.map(formatAuthorName) || [],
        journal: work["container-title"]?.[0],
        publisher: work.publisher,
        publishedDate: formatPublishedDate(work.published),
        type: work.type,
        citedByCount: work["is-referenced-by-count"],
        referencesCount: work["references-count"],
        funders: work.funder?.map((f) => f.name) || [],
        subjects: work.subject || [],
        abstract: work.abstract
          ?.replaceAll(/<[^>]+>/g, "")
          .replaceAll(/\s+/g, " ")
          .trim(),
        url: work.URL || `https://doi.org/${work.DOI}`,
        markdown: formatCrossrefMarkdown(work),
      };

      return {
        success: true,
        doi: cleanDoi,
        work: result,
      } satisfies CrossrefLookupResult;
    } catch (error) {
      return {
        success: false,
        doi,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies CrossrefLookupResult;
    }
  },
});

// =============================================================================
// Tool: Crossref Search
// =============================================================================

export type CrossrefSearchResult = {
  success: boolean;
  query: string;
  total: number;
  works: CrossrefLookupResultItem[];
  error?: string;
};

export const crossrefSearchTool = tool({
  description:
    "Search Crossref for scholarly works by query. " +
    "Crossref indexes 140M+ DOIs with metadata from publishers. " +
    "Use for: finding DOIs for papers, searching by title/author, " +
    "exploring publications from specific journals or funders.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query. Can search by title, author, subject, etc. " +
          "Examples: 'machine learning healthcare', 'author:Einstein relativity', " +
          "'container-title:Nature'"
      ),
    filter: z
      .string()
      .optional()
      .describe(
        "Optional Crossref filter. Examples: " +
          "'from-pub-date:2020' for works after 2020, " +
          "'has-funder:true' for funded works, " +
          "'type:journal-article' for articles only."
      ),
    sort: z
      .string()
      .optional()
      .default("relevance")
      .describe(
        "Sort order: 'relevance' (default), 'published', 'is-referenced-by-count' (citations)"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, filter, sort, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params: Record<string, string> = {
        query,
        rows: searchLimit.toString(),
        sort: sort || "relevance",
        order: "desc",
        mailto: CONTACT_EMAIL,
      };

      if (filter) {
        params.filter = filter;
      }

      const response = await crossrefRequest<CrossrefSearchResponse>(
        "/works",
        params
      );

      if (!response.message.items?.length) {
        return {
          success: true,
          query,
          total: 0,
          works: [],
          error: "No works found in Crossref for this query.",
        } satisfies CrossrefSearchResult;
      }

      const works: CrossrefLookupResultItem[] = response.message.items.map(
        (work) => ({
          doi: work.DOI,
          title: work.title?.[0] || "Untitled",
          authors: work.author?.map(formatAuthorName) || [],
          journal: work["container-title"]?.[0],
          publisher: work.publisher,
          publishedDate: formatPublishedDate(work.published),
          type: work.type,
          citedByCount: work["is-referenced-by-count"],
          referencesCount: work["references-count"],
          funders: work.funder?.map((f) => f.name) || [],
          subjects: work.subject || [],
          abstract: work.abstract
            ?.replaceAll(/<[^>]+>/g, "")
            .replaceAll(/\s+/g, " ")
            .trim(),
          url: work.URL || `https://doi.org/${work.DOI}`,
          markdown: formatCrossrefMarkdown(work),
        })
      );

      return {
        success: true,
        query,
        total: response.message["total-results"],
        works,
      } satisfies CrossrefSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        works: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies CrossrefSearchResult;
    }
  },
});

// =============================================================================
// Tool: Unpaywall Open Access Finder
// =============================================================================

export type UnpaywallResultItem = {
  doi: string;
  isOpenAccess: boolean;
  oaStatus: string;
  bestUrl?: string;
  pdfUrl?: string;
  license?: string;
  version?: string;
  hostType?: string;
  title?: string;
  journal?: string;
  publishedDate?: string;
  allLocations: Array<{
    url: string;
    pdfUrl?: string;
    license?: string;
    version?: string;
    hostType?: string;
  }>;
  markdown: string;
};

export type UnpaywallResult = {
  success: boolean;
  doi: string;
  result?: UnpaywallResultItem;
  error?: string;
};

export const unpaywallTool = tool({
  description:
    "Find free/open access versions of academic papers by DOI using Unpaywall. " +
    "Searches 30M+ papers and returns legal free PDF and HTML links when available. " +
    "Use for: finding free versions of paywalled papers, checking if a paper is open access, " +
    "getting direct PDF download links.",
  inputSchema: z.object({
    doi: z
      .string()
      .min(1)
      .describe(
        "DOI of the paper to find open access for. " +
          "Examples: '10.1038/nature12373', '10.1126/science.1157996'"
      ),
  }),
  execute: async ({ doi }) => {
    try {
      // Clean DOI
      const cleanDoi = doi
        .replace(DOI_URL_PREFIX_REGEX, "")
        .replace(DOI_PREFIX_REGEX, "")
        .trim();

      const response = await fetch(
        `${UNPAYWALL_API_BASE}/${encodeURIComponent(cleanDoi)}?email=${CONTACT_EMAIL}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            doi: cleanDoi,
            result: {
              doi: cleanDoi,
              isOpenAccess: false,
              oaStatus: "closed",
              allLocations: [],
              markdown: `### DOI: ${cleanDoi}\n\n❌ No open access version found for this paper.\n\nThe paper may be behind a paywall.`,
            },
          } satisfies UnpaywallResult;
        }
        throw new Error(`Unpaywall API error: ${response.status}`);
      }

      const data = (await response.json()) as UnpaywallResponse;

      // Format markdown
      let markdown = `### ${data.title || `DOI: ${data.doi}`}\n\n`;

      if (data.is_oa) {
        markdown += `✅ **Open Access:** ${data.oa_status}\n\n`;
        if (data.best_oa_location) {
          markdown += "**Best Access:**\n";
          markdown += `- URL: ${data.best_oa_location.url}\n`;
          if (data.best_oa_location.url_for_pdf) {
            markdown += `- 📄 [Download PDF](${data.best_oa_location.url_for_pdf})\n`;
          }
          if (data.best_oa_location.license) {
            markdown += `- License: ${data.best_oa_location.license}\n`;
          }
          if (data.best_oa_location.version) {
            markdown += `- Version: ${data.best_oa_location.version}\n`;
          }
        }
      } else {
        markdown +=
          "❌ **Not Open Access**\n\nNo free version found for this paper.";
      }

      if (data.journal_name) {
        markdown += `\n*Journal: ${data.journal_name}*`;
      }

      const result: UnpaywallResultItem = {
        doi: data.doi,
        isOpenAccess: data.is_oa,
        oaStatus: data.oa_status,
        bestUrl: data.best_oa_location?.url,
        pdfUrl: data.best_oa_location?.url_for_pdf,
        license: data.best_oa_location?.license,
        version: data.best_oa_location?.version,
        hostType: data.best_oa_location?.host_type,
        title: data.title,
        journal: data.journal_name,
        publishedDate: data.published_date,
        allLocations:
          data.oa_locations?.map((loc) => ({
            url: loc.url,
            pdfUrl: loc.url_for_pdf,
            license: loc.license,
            version: loc.version,
            hostType: loc.host_type,
          })) || [],
        markdown,
      };

      return {
        success: true,
        doi: cleanDoi,
        result,
      } satisfies UnpaywallResult;
    } catch (error) {
      return {
        success: false,
        doi,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies UnpaywallResult;
    }
  },
});
