/**
 * Education Research Tools
 *
 * Provides access to education research databases:
 *
 * 1. ERIC (Education Resources Information Center)
 *    - 1.6M+ education research documents
 *    - Journal articles, reports, conference papers
 *    - Operated by the Institute of Education Sciences (IES)
 *
 * @see https://eric.ed.gov/?api
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const ERIC_API_BASE = "https://api.ies.ed.gov/eric";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;
const MAX_ABSTRACT_LENGTH = 1500;

// =============================================================================
// Types
// =============================================================================

type EricDocument = {
  id: string;
  title: string;
  author: string[];
  source: string;
  publicationdateyear: number;
  description: string;
  subject: string[];
  peerreviewed: string;
  url: string;
  publicationtype: string[];
  educationlevel: string[];
  issn?: string;
  isbn?: string;
  e_fulltextauth?: string;
  e_yearadded?: string;
};

type EricSearchResponse = {
  response: {
    numFound: number;
    start: number;
    docs: EricDocument[];
  };
};

// =============================================================================
// Helpers
// =============================================================================

function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text || "";
  }
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(". ");
  const cutPoint = lastPeriod > maxLength * 0.7 ? lastPeriod + 1 : maxLength;
  return `${truncated.slice(0, cutPoint)}...`;
}

function formatEricMarkdown(doc: EricDocument): string {
  const parts: string[] = [];

  // Title with link
  const url = doc.url || `https://eric.ed.gov/?id=${doc.id}`;
  parts.push(`### [${doc.title}](${url})`);

  // Authors
  if (doc.author?.length) {
    const authorList = doc.author.slice(0, 5).join(", ");
    const moreAuthors =
      doc.author.length > 5 ? ` et al. (+${doc.author.length - 5})` : "";
    parts.push(`**Authors:** ${authorList}${moreAuthors}`);
  }

  // Metadata line
  const meta: string[] = [];
  if (doc.publicationdateyear) {
    meta.push(`**Year:** ${doc.publicationdateyear}`);
  }
  if (doc.source) {
    meta.push(`**Source:** ${doc.source}`);
  }
  if (doc.peerreviewed === "T") {
    meta.push("✓ Peer Reviewed");
  }
  if (meta.length > 0) {
    parts.push(meta.join(" | "));
  }

  // Education levels
  if (doc.educationlevel?.length) {
    parts.push(`**Education Level:** ${doc.educationlevel.join(", ")}`);
  }

  // Subjects
  if (doc.subject?.length) {
    parts.push(`**Subjects:** ${doc.subject.slice(0, 5).join(", ")}`);
  }

  // Abstract
  if (doc.description) {
    const truncatedAbstract = truncateText(
      doc.description,
      MAX_ABSTRACT_LENGTH
    );
    parts.push(`**Abstract:** ${truncatedAbstract}`);
  }

  // ERIC ID
  parts.push(`*ERIC ID: ${doc.id}*`);

  return parts.join("\n");
}

// =============================================================================
// Tool: Search ERIC
// =============================================================================

export type EricSearchResultItem = {
  ericId: string;
  title: string;
  authors: string[];
  year?: number;
  source?: string;
  abstract?: string;
  subjects: string[];
  educationLevels: string[];
  isPeerReviewed: boolean;
  publicationTypes: string[];
  url: string;
  markdown: string;
};

export type EricSearchResult = {
  success: boolean;
  query: string;
  total: number;
  documents: EricSearchResultItem[];
  error?: string;
  markdown: string;
};

export const ericSearchTool = tool({
  description:
    "Search ERIC (Education Resources Information Center) for education research. " +
    "ERIC contains 1.6M+ documents including journal articles, reports, and conference papers " +
    "covering all aspects of education from early childhood to higher education. " +
    "Use for: education policy research, teaching methods, curriculum development, " +
    "educational psychology, learning outcomes, special education, STEM education.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for education research. Use keywords or phrases. " +
          "Examples: 'online learning outcomes', 'STEM education middle school', " +
          "'special education inclusion', 'teacher professional development'"
      ),
    peerReviewedOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, only return peer-reviewed articles."),
    publicationType: z
      .string()
      .optional()
      .describe(
        "Filter by publication type. Options: 'Journal Articles', 'Reports', " +
          "'Books', 'Dissertations/Theses', 'Guides', 'Tests/Questionnaires'"
      ),
    educationLevel: z
      .string()
      .optional()
      .describe(
        "Filter by education level. Options: 'Early Childhood Education', " +
          "'Elementary Education', 'Middle Schools', 'High Schools', " +
          "'Higher Education', 'Adult Education', 'Postsecondary Education'"
      ),
    startYear: z
      .number()
      .int()
      .min(1966)
      .optional()
      .describe(
        "Filter by publication year (from). ERIC coverage starts from 1966."
      ),
    endYear: z
      .number()
      .int()
      .optional()
      .describe("Filter by publication year (to)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum documents to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({
    query,
    peerReviewedOnly,
    publicationType,
    educationLevel,
    startYear,
    endYear,
    limit,
  }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build search URL
      const params = new URLSearchParams({
        search: query,
        format: "json",
        rows: searchLimit.toString(),
        start: "0",
      });

      // Add filters
      if (peerReviewedOnly) {
        params.append("peerreviewed", "T");
      }

      if (publicationType) {
        params.append("publicationtype", `"${publicationType}"`);
      }

      if (educationLevel) {
        params.append("educationlevel", `"${educationLevel}"`);
      }

      if (startYear || endYear) {
        const start = startYear || 1966;
        const end = endYear || new Date().getFullYear();
        params.append("publicationdateyear", `[${start} TO ${end}]`);
      }

      const response = await fetch(`${ERIC_API_BASE}/?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`ERIC API error: ${response.status}`);
      }

      const data = (await response.json()) as EricSearchResponse;

      if (!data.response?.docs?.length) {
        return {
          success: true,
          query,
          total: 0,
          documents: [],
          error: "No education research found. Try different search terms.",
          markdown: `No ERIC documents found for "${query}".`,
        } satisfies EricSearchResult;
      }

      const documents: EricSearchResultItem[] = data.response.docs.map(
        (doc) => ({
          ericId: doc.id,
          title: doc.title,
          authors: doc.author || [],
          year: doc.publicationdateyear,
          source: doc.source,
          abstract: doc.description,
          subjects: doc.subject || [],
          educationLevels: doc.educationlevel || [],
          isPeerReviewed: doc.peerreviewed === "T",
          publicationTypes: doc.publicationtype || [],
          url: doc.url || `https://eric.ed.gov/?id=${doc.id}`,
          markdown: formatEricMarkdown(doc),
        })
      );

      // Build markdown
      let markdown = `### ERIC Search: "${query}"\n\n`;
      markdown += `Found **${data.response.numFound.toLocaleString()}** education research documents.\n\n`;

      for (const doc of documents.slice(0, 10)) {
        markdown += `**[${doc.title}](${doc.url})**\n`;
        if (doc.authors.length > 0) {
          markdown += `${doc.authors.slice(0, 3).join(", ")}`;
          if (doc.authors.length > 3) markdown += " et al.";
          markdown += " • ";
        }
        if (doc.year) markdown += `${doc.year} • `;
        if (doc.isPeerReviewed) markdown += "✓ Peer Reviewed";
        markdown += "\n";
        if (doc.subjects.length > 0) {
          markdown += `*${doc.subjects.slice(0, 3).join(", ")}*\n`;
        }
        markdown += "\n";
      }

      if (documents.length > 10) {
        markdown += `*... and ${data.response.numFound - 10} more documents*\n\n`;
      }

      markdown += "*Source: ERIC (Education Resources Information Center)*";

      return {
        success: true,
        query,
        total: data.response.numFound,
        documents,
        markdown,
      } satisfies EricSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        documents: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies EricSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get ERIC Document Details
// =============================================================================

export type EricDocumentResult = {
  success: boolean;
  ericId: string;
  document?: EricSearchResultItem;
  error?: string;
  markdown: string;
};

export const getEricDocumentTool = tool({
  description:
    "Get detailed information about a specific ERIC document by its ERIC ID. " +
    "Use this after finding documents via search to get full details.",
  inputSchema: z.object({
    ericId: z
      .string()
      .min(1)
      .describe(
        "ERIC document ID. Format: 'EJxxxxxx' for journal articles or 'EDxxxxxx' for other documents. " +
          "Examples: 'EJ1234567', 'ED567890'"
      ),
  }),
  execute: async ({ ericId }) => {
    try {
      // Clean the ERIC ID
      const cleanId = ericId.toUpperCase().trim();

      const params = new URLSearchParams({
        id: cleanId,
        format: "json",
      });

      const response = await fetch(`${ERIC_API_BASE}/?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`ERIC API error: ${response.status}`);
      }

      const data = (await response.json()) as EricSearchResponse;

      if (!data.response?.docs?.length) {
        return {
          success: false,
          ericId: cleanId,
          error: `Document not found: ${cleanId}`,
          markdown: `ERIC document not found: ${cleanId}`,
        } satisfies EricDocumentResult;
      }

      const doc = data.response.docs[0];
      const document: EricSearchResultItem = {
        ericId: doc.id,
        title: doc.title,
        authors: doc.author || [],
        year: doc.publicationdateyear,
        source: doc.source,
        abstract: doc.description,
        subjects: doc.subject || [],
        educationLevels: doc.educationlevel || [],
        isPeerReviewed: doc.peerreviewed === "T",
        publicationTypes: doc.publicationtype || [],
        url: doc.url || `https://eric.ed.gov/?id=${doc.id}`,
        markdown: formatEricMarkdown(doc),
      };

      return {
        success: true,
        ericId: cleanId,
        document,
        markdown: formatEricMarkdown(doc),
      } satisfies EricDocumentResult;
    } catch (error) {
      return {
        success: false,
        ericId,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies EricDocumentResult;
    }
  },
});
