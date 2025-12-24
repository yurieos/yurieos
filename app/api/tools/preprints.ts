/**
 * Life Sciences Preprint Tools
 *
 * Provides access to life sciences preprint servers:
 *
 * 1. bioRxiv - Biology preprints
 * 2. medRxiv - Health sciences preprints
 *    @see https://api.biorxiv.org/
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const BIORXIV_API_BASE = "https://api.biorxiv.org";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 30;
const MAX_ABSTRACT_LENGTH = 1500;

// =============================================================================
// Types
// =============================================================================

type PreprintArticle = {
  doi: string;
  title: string;
  authors: string;
  author_corresponding: string;
  author_corresponding_institution: string;
  date: string;
  version: string;
  type: string;
  license: string;
  category: string;
  jatsxml: string;
  abstract: string;
  published: string;
  server: string;
};

type PreprintResponse = {
  collection: PreprintArticle[];
  messages: Array<{
    status: string;
    count: number;
    total: number;
    cursor: number;
  }>;
};

type PreprintPublisherResponse = {
  collection: Array<{
    doi: string;
    title: string;
    authors: string;
    date: string;
    category: string;
    abstract: string;
    published_doi?: string;
    published_journal?: string;
    published_date?: string;
  }>;
  messages: Array<{
    status: string;
    count: number;
  }>;
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

function formatPreprintMarkdown(article: PreprintArticle): string {
  const parts: string[] = [];

  // Title with link
  const url = `https://doi.org/${article.doi}`;
  parts.push(`### [${article.title}](${url})`);

  // Authors
  if (article.authors) {
    const authorList = article.authors.split("; ").slice(0, 5).join(", ");
    const moreAuthors = article.authors.split("; ").length > 5 ? " et al." : "";
    parts.push(`**Authors:** ${authorList}${moreAuthors}`);
  }

  // Corresponding author and institution
  if (article.author_corresponding) {
    let corrStr = `**Corresponding:** ${article.author_corresponding}`;
    if (article.author_corresponding_institution) {
      corrStr += ` (${article.author_corresponding_institution})`;
    }
    parts.push(corrStr);
  }

  // Metadata
  const meta: string[] = [];
  meta.push(
    `**Server:** ${article.server === "medrxiv" ? "medRxiv" : "bioRxiv"}`
  );
  meta.push(`**Posted:** ${article.date}`);
  if (article.version) {
    meta.push(`**Version:** ${article.version}`);
  }
  if (article.category) {
    meta.push(`**Category:** ${article.category}`);
  }
  parts.push(meta.join(" | "));

  // DOI
  parts.push(`**DOI:** [${article.doi}](https://doi.org/${article.doi})`);

  // Publication status
  if (article.published && article.published !== "NA") {
    parts.push(`📗 **Published:** ${article.published}`);
  } else {
    parts.push("📄 *Preprint - not peer reviewed*");
  }

  // Abstract
  if (article.abstract) {
    const abstract = truncateText(article.abstract, MAX_ABSTRACT_LENGTH);
    parts.push(`**Abstract:** ${abstract}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search bioRxiv/medRxiv Preprints
// =============================================================================

export type PreprintItem = {
  doi: string;
  title: string;
  authors: string[];
  correspondingAuthor?: string;
  institution?: string;
  date: string;
  version: string;
  category: string;
  abstract?: string;
  server: "biorxiv" | "medrxiv";
  isPublished: boolean;
  publishedDoi?: string;
  url: string;
  pdfUrl: string;
  markdown: string;
};

export type PreprintSearchResult = {
  success: boolean;
  server: string;
  interval: string;
  total: number;
  preprints: PreprintItem[];
  error?: string;
  markdown: string;
};

export const preprintSearchTool = tool({
  description:
    "Search bioRxiv and medRxiv for life sciences preprints. " +
    "Access cutting-edge research before peer review in biology and health sciences. " +
    "Use for: latest research findings, COVID-19 research, drug discovery, " +
    "genomics, neuroscience, clinical studies, public health research.",
  inputSchema: z.object({
    server: z
      .enum(["biorxiv", "medrxiv", "both"])
      .optional()
      .default("both")
      .describe(
        "Which preprint server to search: 'biorxiv' (biology), " +
          "'medrxiv' (health sciences), or 'both'."
      ),
    interval: z
      .string()
      .optional()
      .default("2024-01-01")
      .describe(
        "Date range to search. Format: 'YYYY-MM-DD' for papers after date, " +
          "or 'YYYY-MM-DD/YYYY-MM-DD' for date range. Default: last 6 months."
      ),
    category: z
      .string()
      .optional()
      .describe(
        "Filter by category. bioRxiv examples: 'neuroscience', 'genomics', 'immunology'. " +
          "medRxiv examples: 'infectious diseases', 'epidemiology', 'public and global health'."
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum preprints to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ server, interval, category, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Format date interval
      let dateInterval = interval || "2024-01-01";
      if (!dateInterval.includes("/")) {
        const today = new Date().toISOString().split("T")[0];
        dateInterval = `${dateInterval}/${today}`;
      }

      const servers = server === "both" ? ["biorxiv", "medrxiv"] : [server];
      const allPreprints: PreprintItem[] = [];

      for (const srv of servers) {
        const url = `${BIORXIV_API_BASE}/details/${srv}/${dateInterval}/0/${searchLimit}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          console.error(`${srv} API error: ${response.status}`);
          continue;
        }

        const data = (await response.json()) as PreprintResponse;

        if (data.collection?.length) {
          let articles = data.collection;

          // Filter by category if specified
          if (category) {
            const lowerCategory = category.toLowerCase();
            articles = articles.filter((a) =>
              a.category?.toLowerCase().includes(lowerCategory)
            );
          }

          for (const article of articles.slice(
            0,
            Math.floor(searchLimit / servers.length)
          )) {
            allPreprints.push({
              doi: article.doi,
              title: article.title,
              authors: article.authors?.split("; ") || [],
              correspondingAuthor: article.author_corresponding,
              institution: article.author_corresponding_institution,
              date: article.date,
              version: article.version,
              category: article.category,
              abstract: article.abstract,
              server: srv as "biorxiv" | "medrxiv",
              isPublished: article.published !== "NA" && !!article.published,
              publishedDoi:
                article.published !== "NA" ? article.published : undefined,
              url: `https://doi.org/${article.doi}`,
              pdfUrl: `https://www.${srv}.org/content/${article.doi}.full.pdf`,
              markdown: formatPreprintMarkdown(article),
            });
          }
        }
      }

      if (allPreprints.length === 0) {
        return {
          success: true,
          server: server || "both",
          interval: dateInterval,
          total: 0,
          preprints: [],
          error: "No preprints found. Try a different date range or category.",
          markdown: "No preprints found for the specified criteria.",
        } satisfies PreprintSearchResult;
      }

      // Sort by date descending
      allPreprints.sort((a, b) => b.date.localeCompare(a.date));

      // Build markdown
      let markdown = `### ${server === "medrxiv" ? "medRxiv" : server === "biorxiv" ? "bioRxiv" : "bioRxiv/medRxiv"} Preprints\n\n`;
      markdown += `**Period:** ${dateInterval}\n`;
      if (category) {
        markdown += `**Category:** ${category}\n`;
      }
      markdown += `Found ${allPreprints.length} preprints.\n\n`;

      for (const preprint of allPreprints.slice(0, 10)) {
        const serverLabel = preprint.server === "medrxiv" ? "🏥" : "🧬";
        markdown += `${serverLabel} **[${preprint.title}](${preprint.url})**\n`;
        markdown += `${preprint.authors.slice(0, 3).join(", ")}${preprint.authors.length > 3 ? " et al." : ""}\n`;
        markdown += `${preprint.date} | ${preprint.category}`;
        if (preprint.isPublished) {
          markdown += " | ✅ Published";
        }
        markdown += "\n\n";
      }

      markdown += "*Source: bioRxiv/medRxiv*";

      return {
        success: true,
        server: server || "both",
        interval: dateInterval,
        total: allPreprints.length,
        preprints: allPreprints.slice(0, searchLimit),
        markdown,
      } satisfies PreprintSearchResult;
    } catch (error) {
      return {
        success: false,
        server: server || "both",
        interval: interval || "",
        total: 0,
        preprints: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies PreprintSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Preprint Details
// =============================================================================

export type PreprintDetailsResult = {
  success: boolean;
  doi: string;
  preprint?: PreprintItem & {
    fullAbstract?: string;
    license?: string;
    jatsXml?: string;
  };
  error?: string;
};

export const getPreprintDetailsTool = tool({
  description:
    "Get detailed information about a specific bioRxiv or medRxiv preprint by DOI. " +
    "Returns full metadata including abstract, authors, and publication status.",
  inputSchema: z.object({
    doi: z
      .string()
      .min(1)
      .describe(
        "Preprint DOI. Examples: '10.1101/2024.01.15.575766', '10.1101/2024.02.20.24303089'"
      ),
    server: z
      .enum(["biorxiv", "medrxiv"])
      .optional()
      .describe(
        "Which server the preprint is on. Will try both if not specified."
      ),
  }),
  execute: async ({ doi, server }) => {
    try {
      // Clean DOI
      const cleanDoi = doi.replace("https://doi.org/", "").replace("doi:", "");

      const servers = server ? [server] : ["biorxiv", "medrxiv"];

      for (const srv of servers) {
        const url = `${BIORXIV_API_BASE}/details/${srv}/${cleanDoi}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          continue;
        }

        const data = (await response.json()) as PreprintResponse;

        if (data.collection?.length > 0) {
          const article = data.collection[0];

          const preprint = {
            doi: article.doi,
            title: article.title,
            authors: article.authors?.split("; ") || [],
            correspondingAuthor: article.author_corresponding,
            institution: article.author_corresponding_institution,
            date: article.date,
            version: article.version,
            category: article.category,
            abstract: article.abstract,
            fullAbstract: article.abstract,
            server: srv as "biorxiv" | "medrxiv",
            isPublished: article.published !== "NA" && !!article.published,
            publishedDoi:
              article.published !== "NA" ? article.published : undefined,
            url: `https://doi.org/${article.doi}`,
            pdfUrl: `https://www.${srv}.org/content/${article.doi}.full.pdf`,
            markdown: formatPreprintMarkdown(article),
            license: article.license,
            jatsXml: article.jatsxml,
          };

          return {
            success: true,
            doi: cleanDoi,
            preprint,
          } satisfies PreprintDetailsResult;
        }
      }

      return {
        success: false,
        doi: cleanDoi,
        error: `Preprint not found: ${cleanDoi}`,
      } satisfies PreprintDetailsResult;
    } catch (error) {
      return {
        success: false,
        doi,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies PreprintDetailsResult;
    }
  },
});

// =============================================================================
// Tool: Check Preprint Publication Status
// =============================================================================

export type PublicationStatusResult = {
  success: boolean;
  doi: string;
  isPublished: boolean;
  publishedDoi?: string;
  publishedJournal?: string;
  publishedDate?: string;
  error?: string;
};

export const checkPreprintPublishedTool = tool({
  description:
    "Check if a bioRxiv or medRxiv preprint has been published in a peer-reviewed journal. " +
    "Useful for verifying if preprint findings have undergone peer review.",
  inputSchema: z.object({
    doi: z.string().min(1).describe("Preprint DOI to check."),
  }),
  execute: async ({ doi }) => {
    try {
      const cleanDoi = doi.replace("https://doi.org/", "").replace("doi:", "");

      // Try both servers
      for (const srv of ["biorxiv", "medrxiv"]) {
        const url = `${BIORXIV_API_BASE}/pubs/${srv}/${cleanDoi}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          continue;
        }

        const data = (await response.json()) as PreprintPublisherResponse;

        if (data.collection?.length > 0) {
          const pub = data.collection[0];

          return {
            success: true,
            doi: cleanDoi,
            isPublished: !!pub.published_doi,
            publishedDoi: pub.published_doi,
            publishedJournal: pub.published_journal,
            publishedDate: pub.published_date,
          } satisfies PublicationStatusResult;
        }
      }

      return {
        success: true,
        doi: cleanDoi,
        isPublished: false,
        error: "Preprint not found or publication status unknown.",
      } satisfies PublicationStatusResult;
    } catch (error) {
      return {
        success: false,
        doi,
        isPublished: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies PublicationStatusResult;
    }
  },
});
