/**
 * Biomedical Research Tools
 *
 * Provides access to biomedical and life sciences research:
 *
 * 1. PubMed / NCBI E-utilities - 35M+ biomedical literature citations
 *    @see https://www.ncbi.nlm.nih.gov/books/NBK25501/
 *
 * 2. Europe PMC - Open access biomedical literature
 *    @see https://europepmc.org/RestfulWebService
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

// Europe PMC (primary API - better JSON support than NCBI E-utilities)
const EUROPE_PMC_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest";

// Shared limits
const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 20;
const MAX_ABSTRACT_LENGTH = 2000;

// Regex patterns (declared at top level for performance)
const PMID_PREFIX_REGEX = /^PMID:?\s*/i;

// =============================================================================
// Types
// =============================================================================

type PubMedArticle = {
  pmid: string;
  title: string;
  abstract?: string;
  authors: string[];
  journal?: string;
  pubDate?: string;
  doi?: string;
  pmcid?: string;
  meshTerms?: string[];
  publicationType?: string[];
};

type EuropePMCResult = {
  id: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  title?: string;
  authorString?: string;
  journalTitle?: string;
  pubYear?: string;
  abstractText?: string;
  isOpenAccess?: string;
  citedByCount?: number;
  meshHeadingList?: {
    meshHeading?: Array<{ descriptorName: string }>;
  };
};

type EuropePMCResponse = {
  hitCount: number;
  resultList: {
    result: EuropePMCResult[];
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

function formatPubMedMarkdown(article: PubMedArticle): string {
  const parts: string[] = [];

  // Title with PubMed link
  const url = `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;
  parts.push(`### [${article.title}](${url})`);

  // Authors
  if (article.authors.length > 0) {
    const authorList = article.authors.slice(0, 5).join(", ");
    const moreAuthors =
      article.authors.length > 5
        ? ` et al. (+${article.authors.length - 5})`
        : "";
    parts.push(`**Authors:** ${authorList}${moreAuthors}`);
  }

  // Metadata line
  const meta: string[] = [];
  if (article.pubDate) {
    meta.push(`**Published:** ${article.pubDate}`);
  }
  if (article.journal) {
    meta.push(`**Journal:** ${article.journal}`);
  }
  meta.push("🏥 PubMed");
  if (meta.length > 0) {
    parts.push(meta.join(" | "));
  }

  // MeSH terms (medical subject headings)
  if (article.meshTerms && article.meshTerms.length > 0) {
    const terms = article.meshTerms.slice(0, 5).join(", ");
    parts.push(`**MeSH Terms:** ${terms}`);
  }

  // Abstract
  if (article.abstract) {
    const truncatedAbstract = truncateText(
      article.abstract,
      MAX_ABSTRACT_LENGTH
    );
    parts.push(`**Abstract:** ${truncatedAbstract}`);
  }

  // IDs
  const ids: string[] = [`PMID: ${article.pmid}`];
  if (article.doi) {
    ids.push(`DOI: ${article.doi}`);
  }
  if (article.pmcid) {
    ids.push(`PMC: ${article.pmcid}`);
  }
  parts.push(`*${ids.join(" • ")}*`);

  // PMC full text link if available
  if (article.pmcid) {
    parts.push(
      `📄 [Full Text (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/)`
    );
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: PubMed Search (via Europe PMC for better JSON support)
// =============================================================================

export type PubMedSearchResultItem = {
  pmid: string;
  title: string;
  authors: string[];
  journal?: string;
  pubDate?: string;
  abstract?: string;
  doi?: string;
  pmcid?: string;
  isOpenAccess: boolean;
  citedByCount?: number;
  meshTerms: string[];
  url: string;
  markdown: string;
};

export type PubMedSearchResult = {
  success: boolean;
  query: string;
  total: number;
  articles: PubMedSearchResultItem[];
  error?: string;
};

export const pubmedSearchTool = tool({
  description:
    "Search PubMed for biomedical and life sciences literature. " +
    "PubMed contains 35M+ citations for biomedical literature including MEDLINE, " +
    "life science journals, and online books. " +
    "Use this for: medical research, clinical studies, drug information, genetics, " +
    "biology, biochemistry, and health-related topics. " +
    "Returns abstracts, MeSH terms, and links to full text when available.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for biomedical literature. Use medical/scientific terminology. " +
          "Examples: 'CRISPR gene therapy', 'COVID-19 vaccine efficacy', " +
          "'diabetes type 2 treatment meta-analysis', 'cancer immunotherapy'"
      ),
    dateRange: z
      .string()
      .optional()
      .describe(
        "Filter by publication date range. " +
          "Format: 'YYYY-YYYY' (e.g., '2020-2024'), 'YYYY' for single year. " +
          "Leave empty for all dates."
      ),
    articleType: z
      .string()
      .optional()
      .describe(
        "Filter by article type. Options: 'review', 'clinical-trial', 'meta-analysis', " +
          "'randomized-controlled-trial', 'systematic-review', 'case-report'. " +
          "Leave empty for all types."
      ),
    openAccessOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, only return articles with free full text available."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(
        `Maximum number of articles to return (1-${MAX_RESULTS_LIMIT}).`
      ),
  }),
  execute: async ({ query, dateRange, articleType, openAccessOnly, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build Europe PMC query (better JSON API than NCBI E-utilities)
      let searchQuery = query;

      // Add date filter if provided
      if (dateRange) {
        if (dateRange.includes("-")) {
          const [start, end] = dateRange.split("-");
          searchQuery += ` AND (PUB_YEAR:[${start} TO ${end}])`;
        } else {
          searchQuery += ` AND (PUB_YEAR:${dateRange})`;
        }
      }

      // Add article type filter
      if (articleType) {
        const typeMap: Record<string, string> = {
          review: "review",
          "clinical-trial": "clinical trial",
          "meta-analysis": "meta-analysis",
          "randomized-controlled-trial": "randomized controlled trial",
          "systematic-review": "systematic review",
          "case-report": "case reports",
        };
        const mappedType = typeMap[articleType] || articleType;
        searchQuery += ` AND (PUB_TYPE:"${mappedType}")`;
      }

      // Add open access filter
      if (openAccessOnly) {
        searchQuery += " AND (OPEN_ACCESS:y)";
      }

      // Search via Europe PMC (includes PubMed content with better API)
      const params = new URLSearchParams({
        query: searchQuery,
        format: "json",
        pageSize: searchLimit.toString(),
        resultType: "core", // Include abstracts
        sort: "relevance",
      });

      const response = await fetch(
        `${EUROPE_PMC_BASE}/search?${params.toString()}`,
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
          `Europe PMC API error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = (await response.json()) as EuropePMCResponse;

      if (!data.resultList?.result?.length) {
        return {
          success: true,
          query,
          total: 0,
          articles: [],
          error:
            "No biomedical articles found. Try different search terms or broader criteria.",
        } satisfies PubMedSearchResult;
      }

      const articles: PubMedSearchResultItem[] = data.resultList.result.map(
        (item) => {
          const article: PubMedArticle = {
            pmid: item.pmid || item.id,
            title: item.title || "Untitled",
            abstract: item.abstractText,
            authors: item.authorString ? item.authorString.split(", ") : [],
            journal: item.journalTitle,
            pubDate: item.pubYear,
            doi: item.doi,
            pmcid: item.pmcid,
            meshTerms:
              item.meshHeadingList?.meshHeading?.map((m) => m.descriptorName) ||
              [],
          };

          return {
            pmid: article.pmid,
            title: article.title,
            authors: article.authors,
            journal: article.journal,
            pubDate: article.pubDate,
            abstract: article.abstract,
            doi: article.doi,
            pmcid: article.pmcid,
            isOpenAccess: item.isOpenAccess === "Y",
            citedByCount: item.citedByCount,
            meshTerms: article.meshTerms || [],
            url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
            markdown: formatPubMedMarkdown(article),
          };
        }
      );

      return {
        success: true,
        query,
        total: data.hitCount,
        articles,
      } satisfies PubMedSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        articles: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies PubMedSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get PubMed Article Details
// =============================================================================

export type PubMedArticleDetailsResult = {
  success: boolean;
  pmid: string;
  article?: PubMedSearchResultItem & {
    fullAbstract?: string;
    keywords?: string[];
    references?: number;
  };
  error?: string;
};

export const getPubMedArticleTool = tool({
  description:
    "Get detailed information about a specific PubMed article by PMID. " +
    "Use this after finding articles via pubmedSearch to get full abstracts and details. " +
    "Accepts PMID (PubMed ID) as input.",
  inputSchema: z.object({
    pmid: z
      .string()
      .min(1)
      .describe(
        "PubMed ID (PMID) of the article. Example: '12345678', '38765432'"
      ),
  }),
  execute: async ({ pmid }) => {
    try {
      // Clean PMID (remove any prefix)
      const cleanPmid = pmid.replace(PMID_PREFIX_REGEX, "").trim();

      // Fetch from Europe PMC for consistent JSON response
      const params = new URLSearchParams({
        query: `EXT_ID:${cleanPmid} AND SRC:MED`,
        format: "json",
        resultType: "core",
      });

      const response = await fetch(
        `${EUROPE_PMC_BASE}/search?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Europe PMC API error: ${response.status}`);
      }

      const data = (await response.json()) as EuropePMCResponse;

      if (!data.resultList?.result?.length) {
        return {
          success: false,
          pmid: cleanPmid,
          error: `No article found with PMID: ${cleanPmid}`,
        } satisfies PubMedArticleDetailsResult;
      }

      const item = data.resultList.result[0];
      const article: PubMedArticle = {
        pmid: item.pmid || item.id,
        title: item.title || "Untitled",
        abstract: item.abstractText,
        authors: item.authorString ? item.authorString.split(", ") : [],
        journal: item.journalTitle,
        pubDate: item.pubYear,
        doi: item.doi,
        pmcid: item.pmcid,
        meshTerms:
          item.meshHeadingList?.meshHeading?.map((m) => m.descriptorName) || [],
      };

      return {
        success: true,
        pmid: cleanPmid,
        article: {
          pmid: article.pmid,
          title: article.title,
          authors: article.authors,
          journal: article.journal,
          pubDate: article.pubDate,
          abstract: article.abstract,
          doi: article.doi,
          pmcid: article.pmcid,
          isOpenAccess: item.isOpenAccess === "Y",
          citedByCount: item.citedByCount,
          meshTerms: article.meshTerms || [],
          url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
          markdown: formatPubMedMarkdown(article),
          fullAbstract: article.abstract,
          references: item.citedByCount,
        },
      } satisfies PubMedArticleDetailsResult;
    } catch (error) {
      return {
        success: false,
        pmid,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies PubMedArticleDetailsResult;
    }
  },
});

// =============================================================================
// Tool: Clinical Trial Search
// =============================================================================

export type ClinicalTrialResult = {
  success: boolean;
  query: string;
  total: number;
  articles: PubMedSearchResultItem[];
  error?: string;
};

export const clinicalTrialSearchTool = tool({
  description:
    "Search specifically for clinical trial publications in PubMed. " +
    "Returns peer-reviewed publications about clinical trials, including " +
    "randomized controlled trials, meta-analyses, and systematic reviews. " +
    "Use for: drug efficacy studies, treatment comparisons, medical interventions.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Clinical trial search query. Focus on conditions, treatments, or drugs. " +
          "Examples: 'metformin diabetes', 'pembrolizumab melanoma', " +
          "'aspirin cardiovascular prevention'"
      ),
    phase: z
      .string()
      .optional()
      .describe(
        "Filter by trial phase. Options: 'phase-1', 'phase-2', 'phase-3', 'phase-4'. " +
          "Leave empty for all phases."
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
  execute: async ({ query, phase, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build clinical trial specific query
      let searchQuery = `${query} AND (PUB_TYPE:"clinical trial" OR PUB_TYPE:"randomized controlled trial")`;

      if (phase) {
        const phaseMap: Record<string, string> = {
          "phase-1": "clinical trial, phase i",
          "phase-2": "clinical trial, phase ii",
          "phase-3": "clinical trial, phase iii",
          "phase-4": "clinical trial, phase iv",
        };
        if (phaseMap[phase]) {
          searchQuery += ` AND (PUB_TYPE:"${phaseMap[phase]}")`;
        }
      }

      const params = new URLSearchParams({
        query: searchQuery,
        format: "json",
        pageSize: searchLimit.toString(),
        resultType: "core",
        sort: "relevance",
      });

      const response = await fetch(
        `${EUROPE_PMC_BASE}/search?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Europe PMC API error: ${response.status}`);
      }

      const data = (await response.json()) as EuropePMCResponse;

      if (!data.resultList?.result?.length) {
        return {
          success: true,
          query,
          total: 0,
          articles: [],
          error: "No clinical trials found. Try broader search terms.",
        } satisfies ClinicalTrialResult;
      }

      const articles: PubMedSearchResultItem[] = data.resultList.result.map(
        (item) => {
          const article: PubMedArticle = {
            pmid: item.pmid || item.id,
            title: item.title || "Untitled",
            abstract: item.abstractText,
            authors: item.authorString ? item.authorString.split(", ") : [],
            journal: item.journalTitle,
            pubDate: item.pubYear,
            doi: item.doi,
            pmcid: item.pmcid,
            meshTerms:
              item.meshHeadingList?.meshHeading?.map((m) => m.descriptorName) ||
              [],
          };

          return {
            pmid: article.pmid,
            title: article.title,
            authors: article.authors,
            journal: article.journal,
            pubDate: article.pubDate,
            abstract: article.abstract,
            doi: article.doi,
            pmcid: article.pmcid,
            isOpenAccess: item.isOpenAccess === "Y",
            citedByCount: item.citedByCount,
            meshTerms: article.meshTerms || [],
            url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
            markdown: formatPubMedMarkdown(article),
          };
        }
      );

      return {
        success: true,
        query,
        total: data.hitCount,
        articles,
      } satisfies ClinicalTrialResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        articles: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies ClinicalTrialResult;
    }
  },
});
