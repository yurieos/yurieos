/**
 * Physics Research Tools
 *
 * Provides access to physics and high-energy physics databases:
 *
 * 1. INSPIRE-HEP - High Energy Physics literature
 *    @see https://inspirehep.net/help/knowledge-base/inspire-api
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const INSPIRE_API_BASE = "https://inspirehep.net/api";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 25;
const MAX_ABSTRACT_LENGTH = 1500;

// =============================================================================
// Types
// =============================================================================

type InspireAuthor = {
  full_name: string;
  affiliations?: Array<{
    value: string;
  }>;
};

type InspireLiterature = {
  id: number;
  created: string;
  updated: string;
  metadata: {
    titles?: Array<{
      title: string;
      source?: string;
    }>;
    authors?: InspireAuthor[];
    abstracts?: Array<{
      value: string;
      source?: string;
    }>;
    arxiv_eprints?: Array<{
      value: string;
      categories?: string[];
    }>;
    dois?: Array<{
      value: string;
    }>;
    publication_info?: Array<{
      journal_title?: string;
      journal_volume?: string;
      page_start?: string;
      page_end?: string;
      year?: number;
    }>;
    citation_count?: number;
    citation_count_without_self_citations?: number;
    keywords?: Array<{
      value: string;
      schema?: string;
    }>;
    inspire_categories?: Array<{
      term: string;
    }>;
    document_type?: string[];
    texkeys?: string[];
    preprint_date?: string;
  };
  links?: {
    json: string;
    bibtex?: string;
  };
};

type InspireSearchResponse = {
  hits: {
    hits: Array<{
      id: string;
      created: string;
      updated: string;
      metadata: InspireLiterature["metadata"];
      links?: InspireLiterature["links"];
    }>;
    total: number;
  };
};

type InspireAuthorRecord = {
  id: number;
  metadata: {
    name: {
      value: string;
      preferred_name?: string;
    };
    ids?: Array<{
      schema: string;
      value: string;
    }>;
    positions?: Array<{
      institution: string;
      current?: boolean;
      start_date?: string;
      end_date?: string;
    }>;
    arxiv_categories?: string[];
    inspire_categories?: Array<{
      term: string;
    }>;
  };
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

function formatInspireMarkdown(
  record: InspireLiterature["metadata"],
  id: number
): string {
  const parts: string[] = [];

  // Title with link
  const title = record.titles?.[0]?.title || "Untitled";
  const url = `https://inspirehep.net/literature/${id}`;
  parts.push(`### [${title}](${url})`);

  // Authors
  if (record.authors?.length) {
    const authorList = record.authors
      .slice(0, 5)
      .map((a) => a.full_name)
      .join(", ");
    const moreAuthors =
      record.authors.length > 5
        ? ` et al. (+${record.authors.length - 5})`
        : "";
    parts.push(`**Authors:** ${authorList}${moreAuthors}`);
  }

  // Publication info
  const pub = record.publication_info?.[0];
  if (pub) {
    let pubStr = "";
    if (pub.journal_title) {
      pubStr = pub.journal_title;
      if (pub.journal_volume) pubStr += ` ${pub.journal_volume}`;
      if (pub.page_start) pubStr += ` (${pub.page_start}`;
      if (pub.page_end) pubStr += `-${pub.page_end})`;
      else if (pub.page_start) pubStr += ")";
      if (pub.year) pubStr += ` (${pub.year})`;
      parts.push(`**Published:** ${pubStr}`);
    }
  }

  // arXiv
  if (record.arxiv_eprints?.length) {
    const arxiv = record.arxiv_eprints[0];
    const categories = arxiv.categories?.join(", ") || "";
    parts.push(
      `**arXiv:** [${arxiv.value}](https://arxiv.org/abs/${arxiv.value}) [${categories}]`
    );
  }

  // DOI
  if (record.dois?.length) {
    parts.push(
      `**DOI:** [${record.dois[0].value}](https://doi.org/${record.dois[0].value})`
    );
  }

  // Citations
  if (record.citation_count !== undefined && record.citation_count > 0) {
    parts.push(`**Citations:** ${record.citation_count}`);
  }

  // Categories
  if (record.inspire_categories?.length) {
    const cats = record.inspire_categories
      .slice(0, 5)
      .map((c) => c.term)
      .join(", ");
    parts.push(`**Categories:** ${cats}`);
  }

  // Abstract
  if (record.abstracts?.length) {
    const abstract = truncateText(
      record.abstracts[0].value,
      MAX_ABSTRACT_LENGTH
    );
    parts.push(`**Abstract:** ${abstract}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search INSPIRE HEP Literature
// =============================================================================

export type InspirePaperItem = {
  id: number;
  title: string;
  authors: string[];
  abstract?: string;
  year?: number;
  journal?: string;
  arxivId?: string;
  arxivCategories?: string[];
  doi?: string;
  citationCount?: number;
  keywords: string[];
  documentType?: string[];
  url: string;
  bibtexUrl?: string;
  markdown: string;
};

export type InspireSearchResult = {
  success: boolean;
  query: string;
  total: number;
  papers: InspirePaperItem[];
  error?: string;
  markdown: string;
};

export const inspireSearchTool = tool({
  description:
    "Search INSPIRE-HEP for high-energy physics literature. " +
    "INSPIRE is the leading database for particle physics, astrophysics, and related fields. " +
    "Contains 1.5M+ records with citations, full-text links, and BibTeX. " +
    "Use for: physics research, particle physics, astrophysics, cosmology, " +
    "theoretical physics, quantum field theory, gravitational physics.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for physics papers. Use specific physics terms. " +
          "Examples: 'higgs boson', 'dark matter detection', 'quantum gravity', " +
          "'supersymmetry LHC', 'gravitational waves LIGO', 'neutrino oscillation'"
      ),
    author: z
      .string()
      .optional()
      .describe(
        "Filter by author name. Examples: 'Witten', 'Hawking', 'Maldacena'"
      ),
    arxivCategory: z
      .string()
      .optional()
      .describe(
        "Filter by arXiv category. Examples: 'hep-th' (theory), 'hep-ph' (phenomenology), " +
          "'hep-ex' (experiment), 'gr-qc' (general relativity), 'astro-ph' (astrophysics)"
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
    sortBy: z
      .enum(["mostrecent", "mostcited"])
      .optional()
      .default("mostrecent")
      .describe("Sort order: 'mostrecent' or 'mostcited'."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum papers to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({
    query,
    author,
    arxivCategory,
    yearFrom,
    yearTo,
    sortBy,
    limit,
  }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build INSPIRE query
      let inspireQuery = query;
      if (author) {
        inspireQuery += ` and a ${author}`;
      }
      if (arxivCategory) {
        inspireQuery += ` and arxiv_primary_category:${arxivCategory}`;
      }
      if (yearFrom) {
        inspireQuery += ` and date >= ${yearFrom}`;
      }
      if (yearTo) {
        inspireQuery += ` and date <= ${yearTo}`;
      }

      const sort = sortBy === "mostcited" ? "citation_count" : "mostrecent";

      const params = new URLSearchParams({
        q: inspireQuery,
        size: searchLimit.toString(),
        sort,
        fields:
          "titles,authors,abstracts,arxiv_eprints,dois,publication_info,citation_count,inspire_categories,keywords,document_type,texkeys",
      });

      const response = await fetch(
        `${INSPIRE_API_BASE}/literature?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`INSPIRE API error: ${response.status}`);
      }

      const data = (await response.json()) as InspireSearchResponse;

      if (!data.hits?.hits?.length) {
        return {
          success: true,
          query,
          total: 0,
          papers: [],
          error: "No physics papers found. Try different search terms.",
          markdown: `No INSPIRE papers found for "${query}".`,
        } satisfies InspireSearchResult;
      }

      const papers: InspirePaperItem[] = data.hits.hits.map((hit) => {
        const meta = hit.metadata;
        const id = Number.parseInt(hit.id, 10);

        return {
          id,
          title: meta.titles?.[0]?.title || "Untitled",
          authors: meta.authors?.map((a) => a.full_name) || [],
          abstract: meta.abstracts?.[0]?.value,
          year:
            meta.publication_info?.[0]?.year ||
            (meta.preprint_date
              ? Number.parseInt(meta.preprint_date.slice(0, 4), 10)
              : undefined),
          journal: meta.publication_info?.[0]?.journal_title,
          arxivId: meta.arxiv_eprints?.[0]?.value,
          arxivCategories: meta.arxiv_eprints?.[0]?.categories,
          doi: meta.dois?.[0]?.value,
          citationCount: meta.citation_count,
          keywords: meta.keywords?.map((k) => k.value) || [],
          documentType: meta.document_type,
          url: `https://inspirehep.net/literature/${id}`,
          bibtexUrl: hit.links?.bibtex,
          markdown: formatInspireMarkdown(meta, id),
        };
      });

      // Build markdown
      let markdown = `### INSPIRE-HEP: "${query}"\n\n`;
      markdown += `Found ${data.hits.total} papers.\n\n`;

      for (const paper of papers.slice(0, 10)) {
        markdown += `**[${paper.title}](${paper.url})**\n`;
        if (paper.authors.length > 0) {
          markdown += `${paper.authors.slice(0, 3).join(", ")}${paper.authors.length > 3 ? " et al." : ""}\n`;
        }
        if (paper.arxivId) {
          markdown += `arXiv:${paper.arxivId} `;
        }
        if (paper.year) {
          markdown += `(${paper.year}) `;
        }
        if (paper.citationCount) {
          markdown += `| ${paper.citationCount} citations`;
        }
        markdown += "\n\n";
      }

      markdown += "*Source: INSPIRE-HEP*";

      return {
        success: true,
        query,
        total: data.hits.total,
        papers,
        markdown,
      } satisfies InspireSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        papers: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies InspireSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get INSPIRE Paper Details
// =============================================================================

export type InspirePaperDetailsResult = {
  success: boolean;
  id: number;
  paper?: InspirePaperItem & {
    fullAbstract?: string;
    affiliations?: string[];
    references?: number;
    bibtex?: string;
  };
  error?: string;
};

export const getInspirePaperTool = tool({
  description:
    "Get detailed information about a specific INSPIRE-HEP paper by ID. " +
    "Returns full metadata including abstract, authors, citations, and BibTeX. " +
    "Use after searching to get complete paper details.",
  inputSchema: z.object({
    id: z
      .number()
      .int()
      .positive()
      .describe("INSPIRE literature record ID. Example: 1785462"),
  }),
  execute: async ({ id }) => {
    try {
      const response = await fetch(`${INSPIRE_API_BASE}/literature/${id}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            id,
            error: `Paper not found: ${id}`,
          } satisfies InspirePaperDetailsResult;
        }
        throw new Error(`INSPIRE API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        metadata: InspireLiterature["metadata"];
        links?: InspireLiterature["links"];
      };
      const meta = data.metadata;

      // Get affiliations from authors
      const affiliations = meta.authors
        ?.flatMap((a) => a.affiliations?.map((aff) => aff.value) || [])
        .filter((v, i, a) => a.indexOf(v) === i) // unique
        .slice(0, 10);

      const paper = {
        id,
        title: meta.titles?.[0]?.title || "Untitled",
        authors: meta.authors?.map((a) => a.full_name) || [],
        abstract: meta.abstracts?.[0]?.value,
        fullAbstract: meta.abstracts?.[0]?.value,
        year: meta.publication_info?.[0]?.year,
        journal: meta.publication_info?.[0]?.journal_title,
        arxivId: meta.arxiv_eprints?.[0]?.value,
        arxivCategories: meta.arxiv_eprints?.[0]?.categories,
        doi: meta.dois?.[0]?.value,
        citationCount: meta.citation_count,
        keywords: meta.keywords?.map((k) => k.value) || [],
        documentType: meta.document_type,
        url: `https://inspirehep.net/literature/${id}`,
        bibtexUrl: data.links?.bibtex,
        markdown: formatInspireMarkdown(meta, id),
        affiliations,
      };

      return {
        success: true,
        id,
        paper,
      } satisfies InspirePaperDetailsResult;
    } catch (error) {
      return {
        success: false,
        id,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies InspirePaperDetailsResult;
    }
  },
});

// =============================================================================
// Tool: Search INSPIRE Authors
// =============================================================================

export type InspireAuthorItem = {
  id: number;
  name: string;
  preferredName?: string;
  orcid?: string;
  currentPosition?: string;
  arxivCategories: string[];
  url: string;
};

export type InspireAuthorSearchResult = {
  success: boolean;
  query: string;
  total: number;
  authors: InspireAuthorItem[];
  error?: string;
};

export const inspireAuthorSearchTool = tool({
  description:
    "Search INSPIRE-HEP for physics authors and researchers. " +
    "Find researchers in high-energy physics, astrophysics, and related fields. " +
    "Use for: finding researchers, author disambiguation, collaboration networks.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Author name to search. Examples: 'Witten', 'Stephen Hawking', 'Juan Maldacena'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum authors to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        size: searchLimit.toString(),
      });

      const response = await fetch(
        `${INSPIRE_API_BASE}/authors?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`INSPIRE API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        hits: {
          hits: Array<{
            id: string;
            metadata: InspireAuthorRecord["metadata"];
          }>;
          total: number;
        };
      };

      if (!data.hits?.hits?.length) {
        return {
          success: true,
          query,
          total: 0,
          authors: [],
          error: "No authors found. Try a different name.",
        } satisfies InspireAuthorSearchResult;
      }

      const authors: InspireAuthorItem[] = data.hits.hits.map((hit) => {
        const meta = hit.metadata;
        const id = Number.parseInt(hit.id, 10);

        const orcid = meta.ids?.find((i) => i.schema === "ORCID")?.value;
        const currentPos = meta.positions?.find((p) => p.current)?.institution;

        return {
          id,
          name: meta.name.value,
          preferredName: meta.name.preferred_name,
          orcid,
          currentPosition: currentPos,
          arxivCategories: meta.arxiv_categories || [],
          url: `https://inspirehep.net/authors/${id}`,
        };
      });

      return {
        success: true,
        query,
        total: data.hits.total,
        authors,
      } satisfies InspireAuthorSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        authors: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies InspireAuthorSearchResult;
    }
  },
});
