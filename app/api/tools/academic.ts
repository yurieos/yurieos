/**
 * Academic Research Tools
 *
 * Provides comprehensive access to academic research across multiple sources:
 *
 * 1. Semantic Scholar - 200M+ peer-reviewed scholarly articles
 *    @see https://www.semanticscholar.org/product/api
 *
 * 2. arXiv - Scientific preprints in physics, math, CS, biology, and more
 *    @see https://arxiv.org/help/api
 *
 * 3. OpenAlex - Open catalog of 250M+ works, authors, and institutions
 *    @see https://docs.openalex.org
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

// Semantic Scholar
const SEMANTIC_SCHOLAR_API_BASE = "https://api.semanticscholar.org/graph/v1";

// arXiv
const ARXIV_API_BASE = "https://export.arxiv.org/api/query";

// OpenAlex
const OPENALEX_API_BASE = "https://api.openalex.org";

// Shared limits
const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 20;
const MAX_ABSTRACT_LENGTH = 2000;

// =============================================================================
// Types
// =============================================================================

type SemanticScholarAuthor = {
  authorId: string;
  name: string;
};

type SemanticScholarPaper = {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  venue?: string;
  publicationDate?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  isOpenAccess?: boolean;
  openAccessPdf?: {
    url: string;
  };
  authors?: SemanticScholarAuthor[];
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
    PubMed?: string;
  };
  url?: string;
  fieldsOfStudy?: string[];
  tldr?: {
    text: string;
  };
};

type SemanticScholarSearchResponse = {
  total: number;
  offset: number;
  data: SemanticScholarPaper[];
};

// =============================================================================
// Helpers
// =============================================================================

function getApiKey(): string | undefined {
  // API key is optional but recommended for higher rate limits
  return process.env.SEMANTIC_SCHOLAR_API_KEY;
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

function formatPaperMarkdown(paper: SemanticScholarPaper): string {
  const parts: string[] = [];

  // Title with link
  const url =
    paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`;
  parts.push(`### [${paper.title}](${url})`);

  // Authors
  if (paper.authors?.length) {
    const authorList = paper.authors
      .slice(0, 5)
      .map((a) => a.name)
      .join(", ");
    const moreAuthors =
      paper.authors.length > 5 ? ` et al. (+${paper.authors.length - 5})` : "";
    parts.push(`**Authors:** ${authorList}${moreAuthors}`);
  }

  // Metadata line
  const meta: string[] = [];
  if (paper.year) {
    meta.push(`**Year:** ${paper.year}`);
  }
  if (paper.venue) {
    meta.push(`**Venue:** ${paper.venue}`);
  }
  if (paper.citationCount !== undefined) {
    meta.push(`**Citations:** ${paper.citationCount.toLocaleString()}`);
  }
  if (paper.isOpenAccess) {
    meta.push("🔓 Open Access");
  }
  if (meta.length > 0) {
    parts.push(meta.join(" | "));
  }

  // Fields of study
  if (paper.fieldsOfStudy?.length) {
    parts.push(`**Fields:** ${paper.fieldsOfStudy.join(", ")}`);
  }

  // TL;DR (AI-generated summary) or Abstract
  if (paper.tldr?.text) {
    parts.push(`**TL;DR:** ${paper.tldr.text}`);
  } else if (paper.abstract) {
    const truncatedAbstract = truncateText(paper.abstract, MAX_ABSTRACT_LENGTH);
    parts.push(`**Abstract:** ${truncatedAbstract}`);
  }

  // External IDs for reference
  const ids: string[] = [];
  if (paper.externalIds?.DOI) {
    ids.push(`DOI: ${paper.externalIds.DOI}`);
  }
  if (paper.externalIds?.ArXiv) {
    ids.push(`arXiv: ${paper.externalIds.ArXiv}`);
  }
  if (paper.externalIds?.PubMed) {
    ids.push(`PubMed: ${paper.externalIds.PubMed}`);
  }
  if (ids.length > 0) {
    parts.push(`*${ids.join(" • ")}*`);
  }

  // Open Access PDF link
  if (paper.openAccessPdf?.url) {
    parts.push(`📄 [Download PDF](${paper.openAccessPdf.url})`);
  }

  return parts.join("\n");
}

async function semanticScholarRequest<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const apiKey = getApiKey();
  const url = new URL(`${SEMANTIC_SCHOLAR_API_BASE}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 429) {
      throw new Error(
        "Semantic Scholar rate limit exceeded. Please wait a moment and try again."
      );
    }

    if (response.status === 404) {
      throw new Error("No results found for this query.");
    }

    throw new Error(
      `Semantic Scholar API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// Tool: Academic Paper Search
// =============================================================================

export type AcademicSearchResultItem = {
  paperId: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  abstract?: string;
  citationCount?: number;
  isOpenAccess: boolean;
  pdfUrl?: string;
  url: string;
  doi?: string;
  markdown: string;
};

export type AcademicSearchResult = {
  success: boolean;
  query: string;
  total: number;
  papers: AcademicSearchResultItem[];
  error?: string;
};

export const academicSearchTool = tool({
  description:
    "Search Semantic Scholar for peer-reviewed academic papers, research articles, and scientific publications. " +
    "Use this for scholarly research, literature reviews, finding citations, and accessing scientific knowledge. " +
    "Returns papers with abstracts, citation counts, authors, and links to PDFs when available. " +
    "Best for: academic research, scientific questions, finding authoritative sources, literature reviews.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Academic search query. Be specific and use technical terms. " +
          "Examples: 'transformer architecture attention mechanism', " +
          "'CRISPR gene editing therapeutic applications', " +
          "'climate change impact agriculture meta-analysis'"
      ),
    year: z
      .string()
      .optional()
      .describe(
        "Filter by publication year or range. " +
          "Format: 'YYYY' for single year, 'YYYY-' for after, '-YYYY' for before, 'YYYY:YYYY' for range. " +
          "Examples: '2023', '2020-', '-2019', '2018:2023'"
      ),
    fieldsOfStudy: z
      .array(z.string())
      .optional()
      .describe(
        "Filter by academic fields. " +
          "Options: Computer Science, Medicine, Biology, Physics, Chemistry, " +
          "Mathematics, Psychology, Economics, Engineering, Environmental Science, " +
          "Political Science, Sociology, Philosophy, Art, History, Geography, Business, Law"
      ),
    openAccessOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, only return papers with free PDF access."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum number of papers to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, year, fieldsOfStudy, openAccessOnly, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build query parameters
      const params: Record<string, string> = {
        query,
        limit: searchLimit.toString(),
        // Request comprehensive fields for rich results
        fields: [
          "paperId",
          "title",
          "abstract",
          "year",
          "venue",
          "publicationDate",
          "citationCount",
          "influentialCitationCount",
          "isOpenAccess",
          "openAccessPdf",
          "authors",
          "externalIds",
          "url",
          "fieldsOfStudy",
          "tldr",
        ].join(","),
      };

      // Add year filter if provided
      if (year) {
        params.year = year;
      }

      // Add fields of study filter if provided
      if (fieldsOfStudy?.length) {
        params.fieldsOfStudy = fieldsOfStudy.join(",");
      }

      // Add open access filter if requested
      if (openAccessOnly) {
        params.openAccessPdf = "";
      }

      const response =
        await semanticScholarRequest<SemanticScholarSearchResponse>(
          "/paper/search",
          params
        );

      if (!response.data?.length) {
        return {
          success: true,
          query,
          total: 0,
          papers: [],
          error:
            "No academic papers found for this query. Try broadening your search terms.",
        } satisfies AcademicSearchResult;
      }

      const papers: AcademicSearchResultItem[] = response.data.map((paper) => ({
        paperId: paper.paperId,
        title: paper.title,
        authors: paper.authors?.map((a) => a.name) || [],
        year: paper.year,
        venue: paper.venue,
        abstract: paper.abstract,
        citationCount: paper.citationCount,
        isOpenAccess: paper.isOpenAccess ?? false,
        pdfUrl: paper.openAccessPdf?.url,
        url:
          paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
        doi: paper.externalIds?.DOI,
        markdown: formatPaperMarkdown(paper),
      }));

      return {
        success: true,
        query,
        total: response.total,
        papers,
      } satisfies AcademicSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        papers: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies AcademicSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Paper Details
// =============================================================================

export type PaperDetailsResult = {
  success: boolean;
  paperId: string;
  paper?: AcademicSearchResultItem & {
    references?: Array<{ paperId: string; title: string; year?: number }>;
    citations?: Array<{ paperId: string; title: string; year?: number }>;
  };
  error?: string;
};

export const getPaperTool = tool({
  description:
    "Get detailed information about a specific academic paper by its Semantic Scholar ID, DOI, or arXiv ID. " +
    "Use this to get full paper details, citations, and references after finding papers via search. " +
    "Supports multiple ID formats: Semantic Scholar ID, DOI (prefix with 'DOI:'), arXiv ID (prefix with 'ARXIV:').",
  inputSchema: z.object({
    paperId: z
      .string()
      .min(1)
      .describe(
        "Paper identifier. Formats: " +
          "Semantic Scholar ID (e.g., '649def34f8be52c8b66281af98ae884c09aef38b'), " +
          "DOI (e.g., 'DOI:10.1038/nature12373'), " +
          "arXiv ID (e.g., 'ARXIV:2106.09685')"
      ),
    includeReferences: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include papers this paper cites (references)."),
    includeCitations: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include papers that cite this paper."),
  }),
  execute: async ({ paperId, includeReferences, includeCitations }) => {
    try {
      // Build fields list
      const fields = [
        "paperId",
        "title",
        "abstract",
        "year",
        "venue",
        "publicationDate",
        "citationCount",
        "influentialCitationCount",
        "isOpenAccess",
        "openAccessPdf",
        "authors",
        "externalIds",
        "url",
        "fieldsOfStudy",
        "tldr",
      ];

      if (includeReferences) {
        fields.push(
          "references.paperId",
          "references.title",
          "references.year"
        );
      }

      if (includeCitations) {
        fields.push("citations.paperId", "citations.title", "citations.year");
      }

      const params: Record<string, string> = {
        fields: fields.join(","),
      };

      const paper = await semanticScholarRequest<
        SemanticScholarPaper & {
          references?: Array<{ paperId: string; title: string; year?: number }>;
          citations?: Array<{ paperId: string; title: string; year?: number }>;
        }
      >(`/paper/${encodeURIComponent(paperId)}`, params);

      const result: PaperDetailsResult = {
        success: true,
        paperId: paper.paperId,
        paper: {
          paperId: paper.paperId,
          title: paper.title,
          authors: paper.authors?.map((a) => a.name) || [],
          year: paper.year,
          venue: paper.venue,
          abstract: paper.abstract,
          citationCount: paper.citationCount,
          isOpenAccess: paper.isOpenAccess ?? false,
          pdfUrl: paper.openAccessPdf?.url,
          url:
            paper.url ||
            `https://www.semanticscholar.org/paper/${paper.paperId}`,
          doi: paper.externalIds?.DOI,
          markdown: formatPaperMarkdown(paper),
          references: paper.references?.slice(0, 20),
          citations: paper.citations?.slice(0, 20),
        },
      };

      return result;
    } catch (error) {
      return {
        success: false,
        paperId,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies PaperDetailsResult;
    }
  },
});

// =============================================================================
// Tool: Author Search
// =============================================================================

export type AuthorSearchResultItem = {
  authorId: string;
  name: string;
  affiliations?: string[];
  paperCount?: number;
  citationCount?: number;
  hIndex?: number;
  url: string;
};

export type AuthorSearchResult = {
  success: boolean;
  query: string;
  authors: AuthorSearchResultItem[];
  error?: string;
};

export const authorSearchTool = tool({
  description:
    "Search for academic authors and researchers by name. " +
    "Returns author profiles with publication counts, citation metrics, and affiliations. " +
    "Use this to find experts in a field or look up specific researchers.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Author name to search for. " +
          "Examples: 'Geoffrey Hinton', 'Yoshua Bengio', 'Yann LeCun'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .default(5)
      .describe("Maximum number of authors to return (1-10)."),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(limit ?? 5, 10);

      const params: Record<string, string> = {
        query,
        limit: searchLimit.toString(),
        fields: [
          "authorId",
          "name",
          "affiliations",
          "paperCount",
          "citationCount",
          "hIndex",
          "url",
        ].join(","),
      };

      const response = await semanticScholarRequest<{
        data: Array<{
          authorId: string;
          name: string;
          affiliations?: string[];
          paperCount?: number;
          citationCount?: number;
          hIndex?: number;
          url?: string;
        }>;
      }>("/author/search", params);

      if (!response.data?.length) {
        return {
          success: true,
          query,
          authors: [],
          error: "No authors found matching this name.",
        } satisfies AuthorSearchResult;
      }

      const authors: AuthorSearchResultItem[] = response.data.map((author) => ({
        authorId: author.authorId,
        name: author.name,
        affiliations: author.affiliations,
        paperCount: author.paperCount,
        citationCount: author.citationCount,
        hIndex: author.hIndex,
        url:
          author.url ||
          `https://www.semanticscholar.org/author/${author.authorId}`,
      }));

      return {
        success: true,
        query,
        authors,
      } satisfies AuthorSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        authors: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies AuthorSearchResult;
    }
  },
});

// =============================================================================
// arXiv API Integration
// =============================================================================

type ArxivEntry = {
  id: string;
  title: string;
  summary: string;
  published: string;
  updated: string;
  authors: string[];
  categories: string[];
  pdfUrl: string;
  absUrl: string;
};

// arXiv XML parsing regex patterns (top-level for performance)
const ARXIV_ENTRY_REGEX = /<entry>([\s\S]*?)<\/entry>/g;
const ARXIV_ID_REGEX = /<id>([\s\S]*?)<\/id>/;
const ARXIV_TITLE_REGEX = /<title>([\s\S]*?)<\/title>/;
const ARXIV_SUMMARY_REGEX = /<summary>([\s\S]*?)<\/summary>/;
const ARXIV_PUBLISHED_REGEX = /<published>([\s\S]*?)<\/published>/;
const ARXIV_UPDATED_REGEX = /<updated>([\s\S]*?)<\/updated>/;
const ARXIV_AUTHOR_REGEX =
  /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
const ARXIV_CATEGORY_REGEX = /<category[^>]*term="([^"]+)"/g;
const ARXIV_PDF_REGEX = /<link[^>]*title="pdf"[^>]*href="([^"]+)"/;
const WHITESPACE_REGEX = /\s+/g;

/**
 * Parse arXiv Atom XML response into structured data
 */
function parseArxivResponse(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];

  // Reset regex state
  ARXIV_ENTRY_REGEX.lastIndex = 0;

  // Match all entry blocks
  const entryMatches = xml.matchAll(ARXIV_ENTRY_REGEX);

  for (const match of entryMatches) {
    const entryXml = match[1];

    // Extract fields using regex
    const idMatch = entryXml.match(ARXIV_ID_REGEX);
    const id = idMatch ? idMatch[1].trim() : "";
    const arxivId = id.replace("http://arxiv.org/abs/", "").split("v")[0];

    const titleMatch = entryXml.match(ARXIV_TITLE_REGEX);
    const title = titleMatch
      ? titleMatch[1].trim().replaceAll(WHITESPACE_REGEX, " ")
      : "";

    const summaryMatch = entryXml.match(ARXIV_SUMMARY_REGEX);
    const summary = summaryMatch
      ? summaryMatch[1].trim().replaceAll(WHITESPACE_REGEX, " ")
      : "";

    const publishedMatch = entryXml.match(ARXIV_PUBLISHED_REGEX);
    const published = publishedMatch ? publishedMatch[1].trim() : "";

    const updatedMatch = entryXml.match(ARXIV_UPDATED_REGEX);
    const updated = updatedMatch ? updatedMatch[1].trim() : "";

    // Extract authors using matchAll
    const authors: string[] = [];
    const authorMatches = entryXml.matchAll(
      new RegExp(ARXIV_AUTHOR_REGEX.source, "g")
    );
    for (const authorMatch of authorMatches) {
      authors.push(authorMatch[1].trim());
    }

    // Extract categories using matchAll
    const categories: string[] = [];
    const categoryMatches = entryXml.matchAll(
      new RegExp(ARXIV_CATEGORY_REGEX.source, "g")
    );
    for (const catMatch of categoryMatches) {
      categories.push(catMatch[1]);
    }

    const pdfMatch = entryXml.match(ARXIV_PDF_REGEX);
    const pdfUrl = pdfMatch
      ? pdfMatch[1]
      : `https://arxiv.org/pdf/${arxivId}.pdf`;

    entries.push({
      id: arxivId,
      title,
      summary,
      published,
      updated,
      authors,
      categories,
      pdfUrl,
      absUrl: `https://arxiv.org/abs/${arxivId}`,
    });
  }

  return entries;
}

function formatArxivMarkdown(entry: ArxivEntry): string {
  const parts: string[] = [];

  // Title with link
  parts.push(`### [${entry.title}](${entry.absUrl})`);

  // Authors
  if (entry.authors.length > 0) {
    const authorList = entry.authors.slice(0, 5).join(", ");
    const moreAuthors =
      entry.authors.length > 5 ? ` et al. (+${entry.authors.length - 5})` : "";
    parts.push(`**Authors:** ${authorList}${moreAuthors}`);
  }

  // Metadata
  const meta: string[] = [];
  if (entry.published) {
    const date = new Date(entry.published);
    meta.push(`**Published:** ${date.toLocaleDateString()}`);
  }
  if (entry.categories.length > 0) {
    meta.push(`**Categories:** ${entry.categories.slice(0, 3).join(", ")}`);
  }
  meta.push("📄 Preprint");
  if (meta.length > 0) {
    parts.push(meta.join(" | "));
  }

  // Abstract
  if (entry.summary) {
    const truncatedSummary = truncateText(entry.summary, MAX_ABSTRACT_LENGTH);
    parts.push(`**Abstract:** ${truncatedSummary}`);
  }

  // IDs and links
  parts.push(`*arXiv: ${entry.id}*`);
  parts.push(`📄 [Download PDF](${entry.pdfUrl})`);

  return parts.join("\n");
}

export type ArxivSearchResultItem = {
  arxivId: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string;
  categories: string[];
  pdfUrl: string;
  url: string;
  markdown: string;
};

export type ArxivSearchResult = {
  success: boolean;
  query: string;
  total: number;
  papers: ArxivSearchResultItem[];
  error?: string;
};

export const arxivSearchTool = tool({
  description:
    "Search arXiv for scientific preprints and cutting-edge research before peer review. " +
    "arXiv hosts preprints in physics, mathematics, computer science, quantitative biology, " +
    "statistics, electrical engineering, and economics. " +
    "Use this for: latest research findings, emerging topics, technical papers with full PDF access. " +
    "All arXiv papers are freely accessible.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query. Can use arXiv search syntax: " +
          "'all:' for all fields, 'ti:' for title, 'au:' for author, 'abs:' for abstract, 'cat:' for category. " +
          "Examples: 'transformer attention', 'au:hinton', 'cat:cs.LG AND neural network', " +
          "'ti:quantum computing'"
      ),
    category: z
      .string()
      .optional()
      .describe(
        "Filter by arXiv category. Examples: 'cs.LG' (Machine Learning), 'cs.AI' (AI), " +
          "'physics.gen-ph' (General Physics), 'math.CO' (Combinatorics), 'q-bio.NC' (Neurons). " +
          "See https://arxiv.org/category_taxonomy for full list."
      ),
    sortBy: z
      .string()
      .optional()
      .default("relevance")
      .describe(
        "Sort order: 'relevance' (default), 'lastUpdatedDate', or 'submittedDate'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum number of papers to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, category, sortBy, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build search query
      let searchQuery = query;
      if (category) {
        searchQuery = `cat:${category} AND (${query})`;
      }

      // Determine sort parameter
      let sortParam = "relevance";
      if (sortBy === "lastUpdatedDate") {
        sortParam = "lastUpdatedDate";
      } else if (sortBy === "submittedDate") {
        sortParam = "submittedDate";
      }

      // Build URL parameters
      const params = new URLSearchParams({
        search_query: searchQuery,
        start: "0",
        max_results: searchLimit.toString(),
        sortBy: sortParam,
        sortOrder: "descending",
      });

      const response = await fetch(`${ARXIV_API_BASE}?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/atom+xml",
        },
      });

      if (!response.ok) {
        throw new Error(
          `arXiv API error: ${response.status} ${response.statusText}`
        );
      }

      const xml = await response.text();
      const entries = parseArxivResponse(xml);

      if (entries.length === 0) {
        return {
          success: true,
          query,
          total: 0,
          papers: [],
          error:
            "No arXiv papers found for this query. Try different search terms.",
        } satisfies ArxivSearchResult;
      }

      const papers: ArxivSearchResultItem[] = entries.map((entry) => ({
        arxivId: entry.id,
        title: entry.title,
        authors: entry.authors,
        abstract: entry.summary,
        published: entry.published,
        categories: entry.categories,
        pdfUrl: entry.pdfUrl,
        url: entry.absUrl,
        markdown: formatArxivMarkdown(entry),
      }));

      return {
        success: true,
        query,
        total: papers.length,
        papers,
      } satisfies ArxivSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        papers: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies ArxivSearchResult;
    }
  },
});

// =============================================================================
// OpenAlex API Integration
// =============================================================================

type OpenAlexWork = {
  id: string;
  doi?: string;
  title?: string;
  display_name?: string;
  publication_year?: number;
  publication_date?: string;
  type?: string;
  cited_by_count?: number;
  is_oa?: boolean;
  open_access?: {
    is_oa?: boolean;
    oa_url?: string;
  };
  authorships?: Array<{
    author?: {
      id?: string;
      display_name?: string;
    };
    institutions?: Array<{
      display_name?: string;
    }>;
  }>;
  primary_location?: {
    source?: {
      display_name?: string;
    };
  };
  concepts?: Array<{
    display_name?: string;
    score?: number;
  }>;
  abstract_inverted_index?: Record<string, number[]>;
};

type OpenAlexSearchResponse = {
  meta?: {
    count?: number;
  };
  results?: OpenAlexWork[];
};

/**
 * Reconstruct abstract from OpenAlex inverted index format
 */
function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  if (!invertedIndex || Object.keys(invertedIndex).length === 0) {
    return "";
  }

  const words: Array<{ word: string; position: number }> = [];

  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push({ word, position: pos });
    }
  }

  words.sort((a, b) => a.position - b.position);
  return words.map((w) => w.word).join(" ");
}

function formatOpenAlexMarkdown(work: OpenAlexWork): string {
  const parts: string[] = [];

  const title = work.display_name || work.title || "Untitled";
  const url = work.id.replace(
    "https://openalex.org/",
    "https://openalex.org/works/"
  );
  parts.push(`### [${title}](${url})`);

  // Authors
  if (work.authorships?.length) {
    const authorNames = work.authorships
      .slice(0, 5)
      .map((a) => a.author?.display_name || "Unknown")
      .filter((name) => name !== "Unknown");
    if (authorNames.length > 0) {
      const moreAuthors =
        work.authorships.length > 5
          ? ` et al. (+${work.authorships.length - 5})`
          : "";
      parts.push(`**Authors:** ${authorNames.join(", ")}${moreAuthors}`);
    }
  }

  // Metadata
  const meta: string[] = [];
  if (work.publication_year) {
    meta.push(`**Year:** ${work.publication_year}`);
  }
  if (work.primary_location?.source?.display_name) {
    meta.push(`**Source:** ${work.primary_location.source.display_name}`);
  }
  if (work.cited_by_count !== undefined) {
    meta.push(`**Citations:** ${work.cited_by_count.toLocaleString()}`);
  }
  if (work.is_oa || work.open_access?.is_oa) {
    meta.push("🔓 Open Access");
  }
  if (meta.length > 0) {
    parts.push(meta.join(" | "));
  }

  // Concepts (topics)
  if (work.concepts?.length) {
    const topConcepts = work.concepts
      .filter((c) => (c.score || 0) > 0.3)
      .slice(0, 5)
      .map((c) => c.display_name)
      .filter(Boolean);
    if (topConcepts.length > 0) {
      parts.push(`**Topics:** ${topConcepts.join(", ")}`);
    }
  }

  // Abstract
  if (work.abstract_inverted_index) {
    const abstractText = reconstructAbstract(work.abstract_inverted_index);
    if (abstractText) {
      const truncated = truncateText(abstractText, MAX_ABSTRACT_LENGTH);
      parts.push(`**Abstract:** ${truncated}`);
    }
  }

  // IDs
  const ids: string[] = [];
  if (work.doi) {
    ids.push(`DOI: ${work.doi.replace("https://doi.org/", "")}`);
  }
  const openAlexId = work.id.replace("https://openalex.org/", "");
  ids.push(`OpenAlex: ${openAlexId}`);
  parts.push(`*${ids.join(" • ")}*`);

  // Open access link
  if (work.open_access?.oa_url) {
    parts.push(`📄 [Open Access PDF](${work.open_access.oa_url})`);
  }

  return parts.join("\n");
}

export type OpenAlexSearchResultItem = {
  openAlexId: string;
  title: string;
  authors: string[];
  year?: number;
  source?: string;
  abstract?: string;
  citationCount?: number;
  isOpenAccess: boolean;
  pdfUrl?: string;
  doi?: string;
  url: string;
  concepts: string[];
  markdown: string;
};

export type OpenAlexSearchResult = {
  success: boolean;
  query: string;
  total: number;
  papers: OpenAlexSearchResultItem[];
  error?: string;
};

export const openAlexSearchTool = tool({
  description:
    "Search OpenAlex for scholarly works across 250M+ papers, books, and datasets. " +
    "OpenAlex is a free, open catalog with rich metadata on works, authors, institutions, and concepts. " +
    "Use this for: comprehensive literature searches, citation analysis, finding works by institution, " +
    "interdisciplinary research, and when you need open data. " +
    "Advantages: completely free, open data, rich concept tagging, institution affiliations.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for academic works. Use natural language or specific terms. " +
          "Examples: 'machine learning healthcare', 'climate change policy', 'CRISPR applications'"
      ),
    filter: z
      .string()
      .optional()
      .describe(
        "Optional OpenAlex filter. Examples: " +
          "'publication_year:2023' for year, 'is_oa:true' for open access, " +
          "'cited_by_count:>100' for highly cited, 'type:article' for articles only. " +
          "Combine with commas: 'publication_year:2023,is_oa:true'"
      ),
    sort: z
      .string()
      .optional()
      .default("relevance_score:desc")
      .describe(
        "Sort order. Options: 'relevance_score:desc' (default), 'cited_by_count:desc', " +
          "'publication_date:desc', 'publication_year:desc'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum number of results (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, filter, sort, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build URL
      const params = new URLSearchParams({
        search: query,
        per_page: searchLimit.toString(),
        sort: sort || "relevance_score:desc",
        // Request polite pool with email for better rate limits
        mailto: "yurie@research.local",
      });

      if (filter) {
        params.set("filter", filter);
      }

      const response = await fetch(
        `${OPENALEX_API_BASE}/works?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenAlex API error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = (await response.json()) as OpenAlexSearchResponse;

      if (!data.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          papers: [],
          error:
            "No papers found in OpenAlex for this query. Try different search terms.",
        } satisfies OpenAlexSearchResult;
      }

      const papers: OpenAlexSearchResultItem[] = data.results.map((work) => ({
        openAlexId: work.id.replace("https://openalex.org/", ""),
        title: work.display_name || work.title || "Untitled",
        authors:
          work.authorships
            ?.map((a) => a.author?.display_name)
            .filter((n): n is string => n !== undefined) || [],
        year: work.publication_year,
        source: work.primary_location?.source?.display_name,
        abstract: work.abstract_inverted_index
          ? reconstructAbstract(work.abstract_inverted_index)
          : undefined,
        citationCount: work.cited_by_count,
        isOpenAccess: Boolean(work.is_oa || work.open_access?.is_oa),
        pdfUrl: work.open_access?.oa_url,
        doi: work.doi?.replace("https://doi.org/", ""),
        url: work.id.replace(
          "https://openalex.org/",
          "https://openalex.org/works/"
        ),
        concepts:
          work.concepts
            ?.filter((c) => (c.score || 0) > 0.3)
            .slice(0, 5)
            .map((c) => c.display_name)
            .filter((n): n is string => n !== undefined) || [],
        markdown: formatOpenAlexMarkdown(work),
      }));

      return {
        success: true,
        query,
        total: data.meta?.count || papers.length,
        papers,
      } satisfies OpenAlexSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        papers: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies OpenAlexSearchResult;
    }
  },
});
